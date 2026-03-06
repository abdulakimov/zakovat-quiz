import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import { expect, test } from "@playwright/test";

const FLOW_COOKIE = "telegram_oidc_flow";
const SESSION_COOKIE = "zakovat_session";
const prisma = new PrismaClient();
const appOrigin = new URL(
  process.env.PUBLIC_APP_URL ??
    process.env.APP_BASE_URL ??
    process.env.TELEGRAM_OIDC_REDIRECT_URI ??
    "http://localhost:3000/auth/telegram/callback",
).origin;

async function signFlowCookie(input: {
  state: string;
  nonce: string;
  codeVerifier: string;
  locale: "uz" | "ru" | "en";
}) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is required for tests.");
  }

  return new SignJWT(input)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(secret));
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("Telegram login button exists with translated label", async ({ page }) => {
  await page.goto("/uz/auth/login");
  await expect(page.getByTestId("telegram-login-button")).toContainText("Telegram orqali kirish");

  await page.goto("/ru/auth/login");
  await expect(page.getByTestId("telegram-login-button")).toContainText("Telegram");

  await page.goto("/en/auth/login");
  await expect(page.getByTestId("telegram-login-button")).toContainText("Continue with Telegram");
});

test("Start route sets PKCE cookie and redirects to OIDC authorization endpoint", async ({ request }) => {
  const response = await request.get("/auth/telegram/start", { maxRedirects: 0 });
  expect(response.status()).toBeGreaterThanOrEqual(300);
  expect(response.status()).toBeLessThan(400);

  const location = response.headers()["location"];
  expect(location).toBeTruthy();
  const url = new URL(location);
  expect(url.pathname).toBe("/api/test/telegram-oidc/auth");
  expect(url.searchParams.get("client_id")).toBe(process.env.TELEGRAM_OIDC_CLIENT_ID);
  expect(url.searchParams.get("response_type")).toBe("code");
  expect(url.searchParams.get("scope")).toBe("openid profile phone");
  const redirectUri = url.searchParams.get("redirect_uri");
  expect(redirectUri).toBeTruthy();
  const parsedRedirectUri = new URL(redirectUri!);
  expect(parsedRedirectUri.pathname).toBe("/auth/telegram/callback");
  expect(["http:", "https:"]).toContain(parsedRedirectUri.protocol);
  expect(url.searchParams.get("state")).toBeTruthy();
  expect(url.searchParams.get("nonce")).toBeTruthy();
  expect(url.searchParams.get("code_challenge")).toBeTruthy();
  expect(url.searchParams.get("code_challenge_method")).toBe("S256");

  const setCookie = response.headersArray().find((header) => header.name.toLowerCase() === "set-cookie")?.value;
  expect(setCookie).toContain(`${FLOW_COOKIE}=`);
  expect(setCookie).toContain("HttpOnly");
});

test("Callback validates id_token, creates session, and redirects to app", async ({ page }) => {
  const state = "state-test-1";
  const nonce = "nonce-test-1";
  const codeVerifier = "verifier-test-1";
  const providerSub = "tg-user-e2e";
  const flowToken = await signFlowCookie({
    state,
    nonce,
    codeVerifier,
    locale: "uz",
  });

  await page.context().addCookies([
    {
      name: FLOW_COOKIE,
      value: flowToken,
      url: "http://localhost:3000/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  const stateToken = await new SignJWT({
    nonce,
    codeVerifier,
    locale: "uz",
    csrf: state,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(process.env.SESSION_SECRET!));

  const code = `test:${nonce}:${providerSub}`;
  await page.goto(`/uz/auth/telegram/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(stateToken)}`);
  await page.waitForURL(/\/uz\/app/);

  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find((item) => item.name === SESSION_COOKIE);
  expect(sessionCookie).toBeDefined();

  const accounts = await prisma.$queryRaw<Array<{ id: string; userId: string }>>`
    SELECT id, "userId"
    FROM "AuthAccount"
    WHERE provider = 'telegram' AND "providerAccountId" = ${providerSub}
    LIMIT 1
  `;
  expect(accounts.length).toBe(1);
});

test("Callback failure redirects to canonical localized login", async ({ request }) => {
  const response = await request.get("/auth/telegram/callback?error=access_denied", { maxRedirects: 0 });
  expect(response.status()).toBeGreaterThanOrEqual(300);
  expect(response.status()).toBeLessThan(400);

  const location = response.headers()["location"];
  expect(location).toBeTruthy();
  const redirectUrl = new URL(location!, appOrigin);
  if (redirectUrl.hostname === "localhost") {
    expect(redirectUrl.protocol).toBe("http:");
  }
  expect(`${redirectUrl.pathname}${redirectUrl.search}`).toContain("/uz/auth/login?error=telegram_oauth_failed");
});

