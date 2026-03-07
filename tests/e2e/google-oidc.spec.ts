import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { PrismaClient } from "@prisma/client";
import { exportJWK, generateKeyPair, SignJWT, type JWK, type KeyLike } from "jose";
import { expect, test } from "@playwright/test";

const FLOW_COOKIE = "google_oidc_flow";
const SESSION_COOKIE = "zakovat_session";
const APP_BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const MOCK_ORIGIN = process.env.GOOGLE_OIDC_MOCK_ORIGIN ?? "http://127.0.0.1:4011";
const MOCK_PORT = Number(new URL(MOCK_ORIGIN).port || "4011");
const REDIRECT_URI = process.env.GOOGLE_OIDC_REDIRECT_URI ?? `${APP_BASE_URL}/auth/google/callback`;
const prisma = new PrismaClient();

let signingKey: KeyLike | null = null;
let jwks: { keys: JWK[] } = { keys: [] };
let mockServer: ReturnType<typeof createServer> | null = null;

async function signIdToken(input: { sub: string; nonce: string; aud: string }) {
  if (!signingKey || !jwks.keys[0]?.kid) {
    throw new Error("Mock server key is not initialized.");
  }

  return new SignJWT({
    sub: input.sub,
    nonce: input.nonce,
    email: `${input.sub}@example.com`,
    email_verified: true,
    name: "Google Test User",
    given_name: "Google",
    family_name: "Tester",
    picture: "https://example.com/avatar.png",
  })
    .setProtectedHeader({ alg: "RS256", kid: jwks.keys[0].kid, typ: "JWT" })
    .setIssuer("https://accounts.google.com")
    .setAudience(input.aud)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(signingKey);
}

async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

function parseCode(code: string) {
  const [, nonce, sub] = code.split(":");
  return {
    nonce: nonce || "google-test-nonce",
    sub: sub || "google-test-sub",
  };
}

async function requestHandler(request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url || "/", MOCK_ORIGIN);

  if (request.method === "GET" && url.pathname === "/jwks") {
    response.statusCode = 200;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify(jwks));
    return;
  }

  if (request.method === "GET" && url.pathname === "/auth") {
    response.statusCode = 200;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  if (request.method === "POST" && url.pathname === "/token") {
    const body = await readBody(request);
    const form = new URLSearchParams(body);
    const code = form.get("code") ?? "";
    const clientId = form.get("client_id") ?? "";
    const grantType = form.get("grant_type") ?? "";
    const redirectUri = form.get("redirect_uri") ?? "";
    const codeVerifier = form.get("code_verifier") ?? "";

    if (!code || !clientId || grantType !== "authorization_code" || !redirectUri || !codeVerifier) {
      response.statusCode = 400;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ error: "invalid_request" }));
      return;
    }

    const parsed = parseCode(code);
    const idToken = await signIdToken({
      sub: parsed.sub,
      nonce: parsed.nonce,
      aud: clientId,
    });

    response.statusCode = 200;
    response.setHeader("content-type", "application/json");
    response.end(
      JSON.stringify({
        token_type: "Bearer",
        access_token: "mock-google-access-token",
        expires_in: 3600,
        id_token: idToken,
      }),
    );
    return;
  }

  response.statusCode = 404;
  response.end("Not found");
}

function getSetCookieHeader(responseHeaders: { name: string; value: string }[], cookieName: string) {
  return responseHeaders.find((header) => header.name.toLowerCase() === "set-cookie" && header.value.includes(`${cookieName}=`))
    ?.value;
}

test.beforeAll(async () => {
  const keyPair = await generateKeyPair("RS256");
  signingKey = keyPair.privateKey;
  const publicJwk = (await exportJWK(keyPair.publicKey)) as JWK;
  jwks = { keys: [{ ...publicJwk, kid: "google-oidc-test-key", alg: "RS256", use: "sig" }] };

  await new Promise<void>((resolve, reject) => {
    const server = createServer((request, response) => {
      void requestHandler(request, response).catch((error) => {
        response.statusCode = 500;
        response.end(String(error));
      });
    });

    server.on("error", reject);
    server.listen(MOCK_PORT, "127.0.0.1", () => {
      mockServer = server;
      resolve();
    });
  });
});

test.afterAll(async () => {
  if (mockServer) {
    await new Promise<void>((resolve, reject) => {
      mockServer?.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
  await prisma.$disconnect();
});

test("Google login button exists with translated label", async ({ page }) => {
  await page.goto("/uz/auth/login");
  await expect(page.getByTestId("google-login")).toContainText("Google orqali kirish");

  await page.goto("/ru/auth/login");
  await expect(page.getByTestId("google-login")).toContainText("Google");

  await page.goto("/en/auth/login");
  await expect(page.getByTestId("google-login")).toContainText("Continue with Google");
});

test("Start route sets PKCE cookie and redirects to Google authorization endpoint", async ({ request }) => {
  const response = await request.get("/auth/google/start", { maxRedirects: 0 });
  expect(response.status()).toBeGreaterThanOrEqual(300);
  expect(response.status()).toBeLessThan(400);

  const location = response.headers().location;
  expect(location).toBeTruthy();
  const url = new URL(location);
  expect(url.origin).toBe(new URL(process.env.GOOGLE_OIDC_AUTH_URL ?? `${MOCK_ORIGIN}/auth`).origin);
  expect(url.pathname).toBe(new URL(process.env.GOOGLE_OIDC_AUTH_URL ?? `${MOCK_ORIGIN}/auth`).pathname);
  expect(url.searchParams.get("client_id")).toBe(process.env.GOOGLE_OIDC_CLIENT_ID);
  expect(url.searchParams.get("response_type")).toBe("code");
  expect(url.searchParams.get("scope")).toBe(process.env.GOOGLE_OIDC_SCOPES ?? "openid email profile");
  expect(url.searchParams.get("state")).toBeTruthy();
  expect(url.searchParams.get("nonce")).toBeTruthy();
  expect(url.searchParams.get("code_challenge")).toBeTruthy();
  expect(url.searchParams.get("code_challenge_method")).toBe("S256");

  const redirectUri = url.searchParams.get("redirect_uri");
  expect(redirectUri).toBeTruthy();
  expect(redirectUri).toBe(REDIRECT_URI);

  const setCookie = getSetCookieHeader(response.headersArray(), FLOW_COOKIE);
  expect(setCookie).toContain(`${FLOW_COOKIE}=`);
  expect(setCookie).toContain("HttpOnly");
});

test("Callback validates id_token, creates session, and redirects to app", async ({ page, request }) => {
  const startResponse = await request.get("/auth/google/start", { maxRedirects: 0 });
  const location = startResponse.headers().location;
  expect(location).toBeTruthy();

  const authUrl = new URL(location);
  const state = authUrl.searchParams.get("state");
  const nonce = authUrl.searchParams.get("nonce");
  expect(state).toBeTruthy();
  expect(nonce).toBeTruthy();

  const flowCookie = getSetCookieHeader(startResponse.headersArray(), FLOW_COOKIE);
  expect(flowCookie).toBeTruthy();
  const flowCookieValue = flowCookie!.split(";")[0].split("=").slice(1).join("=");
  const providerSub = "google-user-e2e";
  const code = `test:${nonce}:${providerSub}`;

  await page.context().addCookies([
    {
      name: FLOW_COOKIE,
      value: flowCookieValue,
      url: `${APP_BASE_URL}/`,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto(`/auth/google/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state ?? "")}`);
  await page.waitForURL(/\/uz\/app/);

  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find((item) => item.name === SESSION_COOKIE);
  expect(sessionCookie).toBeDefined();

  const accounts = await prisma.$queryRaw<Array<{ id: string; userId: string }>>`
    SELECT id, "userId"
    FROM "AuthAccount"
    WHERE provider = 'google' AND "providerAccountId" = ${providerSub}
    LIMIT 1
  `;
  expect(accounts.length).toBe(1);
});

test("Callback with wrong state rejects login", async ({ request }) => {
  const startResponse = await request.get("/auth/google/start", { maxRedirects: 0 });
  const flowCookie = getSetCookieHeader(startResponse.headersArray(), FLOW_COOKIE);
  expect(flowCookie).toBeTruthy();
  const cookiePair = flowCookie!.split(";")[0];

  const response = await request.get("/auth/google/callback?code=test:nonce:sub&state=wrong-state", {
    maxRedirects: 0,
    headers: {
      cookie: cookiePair,
    },
  });

  if (response.status() >= 300 && response.status() < 400) {
    const location = response.headers().location;
    expect(location).toContain("/uz/auth/login?error=google_oauth_invalid_state");
    return;
  }

  expect(response.status()).toBe(400);
});
