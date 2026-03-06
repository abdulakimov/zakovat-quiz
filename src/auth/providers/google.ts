import { createHash, randomBytes } from "node:crypto";
import { SignJWT, createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";
import { getGoogleOidcEnv, getSessionEnv } from "@/src/env";
import { logger } from "@/lib/logger";
import { joinUrl, shouldDebugAuthLogs } from "@/src/lib/url";

export const GOOGLE_PROVIDER = "google";
export const GOOGLE_FLOW_COOKIE = "google_oidc_flow";
export const GOOGLE_FLOW_TTL_SECONDS = 60 * 10;
export const GOOGLE_CALLBACK_PATH = "/auth/google/callback";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const DEFAULT_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const DEFAULT_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const DEFAULT_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
const DEFAULT_SCOPES = "openid email profile";

type GoogleEndpoints = {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwksUri: string;
};

type GoogleFlowPayload = {
  state: string;
  nonce: string;
  codeVerifier: string;
  locale: string;
  nextPath: string;
};

export type GoogleIdTokenClaims = {
  sub: string;
  nonce?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
};

let flowSecretCache: Uint8Array | null = null;

function getFlowSecret() {
  if (!flowSecretCache) {
    flowSecretCache = new TextEncoder().encode(getSessionEnv().SESSION_SECRET);
  }
  return flowSecretCache;
}

export function getGoogleEnv() {
  return getGoogleOidcEnv();
}

function validateResolvedRedirectUri(redirectUri: string) {
  const parsed = new URL(redirectUri);
  if (!parsed.pathname.startsWith(GOOGLE_CALLBACK_PATH)) {
    throw new Error(
      `GOOGLE_OIDC_REDIRECT_URI must include callback path "${GOOGLE_CALLBACK_PATH}" (resolved: ${redirectUri}).`,
    );
  }
}

export function resolveGoogleRedirectUri(baseUrl: string) {
  const configured = getGoogleEnv().GOOGLE_OIDC_REDIRECT_URI?.trim();
  if (!configured) {
    return joinUrl(baseUrl, GOOGLE_CALLBACK_PATH);
  }

  const parsed = new URL(configured);
  const hasPath = parsed.pathname !== "/" || Boolean(parsed.search) || Boolean(parsed.hash);
  const resolved = hasPath ? parsed.toString() : joinUrl(parsed.origin, GOOGLE_CALLBACK_PATH);

  validateResolvedRedirectUri(resolved);
  return resolved;
}

export function getGoogleScopes() {
  return getGoogleEnv().GOOGLE_OIDC_SCOPES?.trim() || DEFAULT_SCOPES;
}

export function getGoogleEndpoints(): GoogleEndpoints {
  const env = getGoogleEnv();
  return {
    authorizationEndpoint: env.GOOGLE_OIDC_AUTH_URL ?? DEFAULT_AUTH_ENDPOINT,
    tokenEndpoint: env.GOOGLE_OIDC_TOKEN_URL ?? DEFAULT_TOKEN_ENDPOINT,
    jwksUri: env.GOOGLE_OIDC_JWKS_URL ?? DEFAULT_JWKS_URI,
  };
}

function randomStateLikeValue() {
  return randomBytes(32).toString("base64url");
}

export function generatePkceVerifier() {
  return randomBytes(64).toString("base64url");
}

export function createCodeChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function createGoogleFlowValues() {
  const codeVerifier = generatePkceVerifier();
  return {
    state: randomStateLikeValue(),
    nonce: randomStateLikeValue(),
    codeVerifier,
    codeChallenge: createCodeChallenge(codeVerifier),
  };
}

export async function signGoogleFlowCookie(payload: GoogleFlowPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${GOOGLE_FLOW_TTL_SECONDS}s`)
    .sign(getFlowSecret());
}

export async function verifyGoogleFlowCookie(token: string) {
  try {
    const { payload } = await jwtVerify<GoogleFlowPayload>(token, getFlowSecret());
    return payload;
  } catch {
    return null;
  }
}

export function buildGoogleAuthUrl(input: {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  nonce: string;
  codeChallenge: string;
}) {
  const url = new URL(input.authorizationEndpoint);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", input.scope);
  url.searchParams.set("state", input.state);
  url.searchParams.set("nonce", input.nonce);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url;
}

export async function exchangeGoogleCodeForIdToken(input: {
  tokenEndpoint: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}) {
  const form = new URLSearchParams();
  form.set("grant_type", "authorization_code");
  form.set("code", input.code);
  form.set("redirect_uri", input.redirectUri);
  form.set("client_id", input.clientId);
  form.set("client_secret", input.clientSecret);
  form.set("code_verifier", input.codeVerifier);

  const response = await fetch(input.tokenEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: form,
    cache: "no-store",
  });

  if (shouldDebugAuthLogs()) {
    logger.info("Google token exchange response", {
      tokenEndpoint: input.tokenEndpoint,
      status: response.status,
      ok: response.ok,
    });
  }

  if (!response.ok) {
    throw new Error(`Google token exchange failed (${response.status}).`);
  }

  const payload = z
    .object({
      id_token: z.string().min(1),
    })
    .passthrough()
    .parse(await response.json());

  return payload.id_token;
}

export async function verifyGoogleIdToken(input: {
  idToken: string;
  jwksUri: string;
  clientId: string;
  nonce: string;
}) {
  const jwks = createRemoteJWKSet(new URL(input.jwksUri));
  const { payload } = await jwtVerify<GoogleIdTokenClaims>(input.idToken, jwks, {
    issuer: GOOGLE_ISSUERS,
    audience: input.clientId,
    algorithms: ["RS256"],
    maxTokenAge: "10m",
  });

  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("Google id_token is missing required sub claim.");
  }

  if (payload.nonce && payload.nonce !== input.nonce) {
    throw new Error("Google nonce does not match.");
  }

  return payload;
}
