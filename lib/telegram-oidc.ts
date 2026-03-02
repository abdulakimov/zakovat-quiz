import { createHash, randomBytes } from "node:crypto";
import { SignJWT, createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";
import { getSessionEnv, getTelegramOidcEnv } from "@/src/env";

export const TELEGRAM_PROVIDER = "telegram";
export const TELEGRAM_FLOW_COOKIE = "telegram_oidc_flow";
export const TELEGRAM_FLOW_TTL_SECONDS = 60 * 10;
const DEFAULT_ISSUER = "https://oauth.telegram.org";
const DEFAULT_DISCOVERY = "https://oauth.telegram.org/.well-known/openid-configuration";

type TelegramDiscovery = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
};

type TelegramEndpoints = {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwksUri: string;
};

type TelegramFlowPayload = {
  state: string;
  nonce: string;
  codeVerifier: string;
  locale: string;
};

type TelegramStatePayload = {
  nonce: string;
  codeVerifier: string;
  locale: string;
  csrf: string;
};

type TelegramIdTokenClaims = {
  sub: string;
  nonce?: string;
  name?: string;
  preferred_username?: string;
  picture?: string;
  phone_number?: string;
  id?: string | number;
};

let flowSecretCache: Uint8Array | null = null;
let discoveryCache: { expiresAt: number; value: TelegramDiscovery } | null = null;

function getFlowSecret() {
  if (!flowSecretCache) {
    flowSecretCache = new TextEncoder().encode(getSessionEnv().SESSION_SECRET);
  }
  return flowSecretCache;
}

export function getTelegramEnv() {
  return getTelegramOidcEnv();
}

export function getTelegramRedirectUri() {
  return getTelegramEnv().TELEGRAM_OIDC_REDIRECT_URI;
}

export function generatePkceVerifier() {
  return randomBytes(64).toString("base64url");
}

export function createCodeChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

function randomStateLikeValue() {
  return randomBytes(32).toString("base64url");
}

export function createTelegramFlowValues() {
  const codeVerifier = generatePkceVerifier();
  return {
    state: randomStateLikeValue(),
    nonce: randomStateLikeValue(),
    codeVerifier,
    codeChallenge: createCodeChallenge(codeVerifier),
  };
}

export async function signTelegramFlowCookie(payload: TelegramFlowPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TELEGRAM_FLOW_TTL_SECONDS}s`)
    .sign(getFlowSecret());
}

export async function verifyTelegramFlowCookie(token: string) {
  try {
    const { payload } = await jwtVerify<TelegramFlowPayload>(token, getFlowSecret());
    return payload;
  } catch {
    return null;
  }
}

export async function signTelegramStateToken(payload: TelegramStatePayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TELEGRAM_FLOW_TTL_SECONDS}s`)
    .sign(getFlowSecret());
}

export async function verifyTelegramStateToken(token: string) {
  try {
    const { payload } = await jwtVerify<TelegramStatePayload>(token, getFlowSecret());
    return payload;
  } catch {
    return null;
  }
}

async function fetchDiscoveryInternal() {
  const now = Date.now();
  if (discoveryCache && discoveryCache.expiresAt > now) {
    return discoveryCache.value;
  }

  const env = getTelegramEnv();
  const url = env.TELEGRAM_OIDC_DISCOVERY_URL ?? DEFAULT_DISCOVERY;
  const response = await fetch(url, {
    cache: "no-store",
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Telegram discovery request failed (${response.status}).`);
  }

  const parsed = z
    .object({
      issuer: z.string().url(),
      authorization_endpoint: z.string().url(),
      token_endpoint: z.string().url(),
      jwks_uri: z.string().url(),
    })
    .parse(await response.json());

  discoveryCache = {
    value: parsed,
    expiresAt: now + 5 * 60 * 1000,
  };

  return parsed;
}

export async function getTelegramDiscovery() {
  return fetchDiscoveryInternal();
}

export async function getTelegramEndpoints(): Promise<TelegramEndpoints> {
  const env = getTelegramEnv();
  if (env.TELEGRAM_OIDC_AUTH_URL && env.TELEGRAM_OIDC_TOKEN_URL && env.TELEGRAM_OIDC_JWKS_URL) {
    return {
      authorizationEndpoint: env.TELEGRAM_OIDC_AUTH_URL,
      tokenEndpoint: env.TELEGRAM_OIDC_TOKEN_URL,
      jwksUri: env.TELEGRAM_OIDC_JWKS_URL,
    };
  }

  const discovery = await getTelegramDiscovery();
  return {
    authorizationEndpoint: discovery.authorization_endpoint,
    tokenEndpoint: discovery.token_endpoint,
    jwksUri: discovery.jwks_uri,
  };
}

export function buildTelegramAuthUrl(input: {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
}) {
  const url = new URL(input.authorizationEndpoint);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile phone");
  url.searchParams.set("state", input.state);
  url.searchParams.set("nonce", input.nonce);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url;
}

export async function exchangeTelegramCodeForIdToken(input: {
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
  form.set("code_verifier", input.codeVerifier);

  const basicAuth = Buffer.from(`${input.clientId}:${input.clientSecret}`).toString("base64");

  const response = await fetch(input.tokenEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${basicAuth}`,
      accept: "application/json",
    },
    body: form,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Telegram token exchange failed (${response.status}).`);
  }

  const payload = z
    .object({
      id_token: z.string().min(1),
    })
    .passthrough()
    .parse(await response.json());

  return payload.id_token;
}

export async function verifyTelegramIdToken(input: {
  idToken: string;
  jwksUri: string;
  clientId: string;
  nonce: string;
}) {
  const jwks = createRemoteJWKSet(new URL(input.jwksUri));
  const { payload } = await jwtVerify<TelegramIdTokenClaims>(input.idToken, jwks, {
    issuer: DEFAULT_ISSUER,
    audience: input.clientId,
    algorithms: ["RS256"],
    maxTokenAge: "10m",
  });

  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("Telegram id_token is missing required sub claim.");
  }

  if (payload.nonce !== input.nonce) {
    throw new Error("Telegram nonce does not match.");
  }

  return payload;
}
