import { defineConfig, devices } from "@playwright/test";

const sessionSecret =
  process.env.SESSION_SECRET ?? "playwright-session-secret-0123456789abcdef";
const telegramClientId = process.env.TELEGRAM_OIDC_CLIENT_ID ?? "123456789";
const telegramClientSecret =
  process.env.TELEGRAM_OIDC_CLIENT_SECRET ?? "playwright-telegram-secret";
const telegramRedirectUri =
  process.env.TELEGRAM_OIDC_REDIRECT_URI ?? "http://localhost:3000/auth/telegram/callback";
const telegramDiscoveryUrl =
  process.env.TELEGRAM_OIDC_DISCOVERY_URL ??
  "http://localhost:3000/api/test/telegram-oidc/discovery";
const telegramAuthUrl =
  process.env.TELEGRAM_OIDC_AUTH_URL ?? "http://localhost:3000/api/test/telegram-oidc/auth";
const telegramTokenUrl =
  process.env.TELEGRAM_OIDC_TOKEN_URL ?? "http://localhost:3000/api/test/telegram-oidc/token";
const telegramJwksUrl =
  process.env.TELEGRAM_OIDC_JWKS_URL ?? "http://localhost:3000/api/test/telegram-oidc/jwks";
const googleMockOrigin = process.env.GOOGLE_OIDC_MOCK_ORIGIN ?? "http://127.0.0.1:4011";
const googleClientId = process.env.GOOGLE_OIDC_CLIENT_ID ?? "playwright-google-client-id";
const googleClientSecret =
  process.env.GOOGLE_OIDC_CLIENT_SECRET ?? "playwright-google-client-secret";
const googleRedirectUri =
  process.env.GOOGLE_OIDC_REDIRECT_URI ?? "http://localhost:3000/auth/google/callback";
const googleScopes = process.env.GOOGLE_OIDC_SCOPES ?? "openid email profile";
const googleAuthUrl = process.env.GOOGLE_OIDC_AUTH_URL ?? `${googleMockOrigin}/auth`;
const googleTokenUrl = process.env.GOOGLE_OIDC_TOKEN_URL ?? `${googleMockOrigin}/token`;
const googleJwksUrl = process.env.GOOGLE_OIDC_JWKS_URL ?? `${googleMockOrigin}/jwks`;
const appBaseUrl =
  process.env.PUBLIC_APP_URL ?? process.env.APP_BASE_URL ?? "http://localhost:3000";

process.env.SESSION_SECRET = sessionSecret;
process.env.TELEGRAM_OIDC_CLIENT_ID = telegramClientId;
process.env.GOOGLE_OIDC_CLIENT_ID = googleClientId;

export default defineConfig({
  testDir: "tests",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      SESSION_SECRET: sessionSecret,
      TELEGRAM_OIDC_CLIENT_ID: telegramClientId,
      TELEGRAM_OIDC_CLIENT_SECRET: telegramClientSecret,
      TELEGRAM_OIDC_REDIRECT_URI: telegramRedirectUri,
      TELEGRAM_OIDC_DISCOVERY_URL: telegramDiscoveryUrl,
      TELEGRAM_OIDC_AUTH_URL: telegramAuthUrl,
      TELEGRAM_OIDC_TOKEN_URL: telegramTokenUrl,
      TELEGRAM_OIDC_JWKS_URL: telegramJwksUrl,
      GOOGLE_OIDC_CLIENT_ID: googleClientId,
      GOOGLE_OIDC_CLIENT_SECRET: googleClientSecret,
      GOOGLE_OIDC_REDIRECT_URI: googleRedirectUri,
      GOOGLE_OIDC_SCOPES: googleScopes,
      GOOGLE_OIDC_AUTH_URL: googleAuthUrl,
      GOOGLE_OIDC_TOKEN_URL: googleTokenUrl,
      GOOGLE_OIDC_JWKS_URL: googleJwksUrl,
      APP_BASE_URL: appBaseUrl,
      PUBLIC_APP_URL: appBaseUrl,
    },
  },
});
