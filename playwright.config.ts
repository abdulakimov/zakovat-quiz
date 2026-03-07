import { defineConfig, devices } from "@playwright/test";

const playwrightPort = process.env.PLAYWRIGHT_PORT ?? "3001";
const playwrightBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${playwrightPort}`;
const appOrigin = new URL(playwrightBaseUrl).origin;

const sessionSecret =
  process.env.SESSION_SECRET ?? "playwright-session-secret-0123456789abcdef";
const telegramClientId = process.env.TELEGRAM_OIDC_CLIENT_ID ?? "123456789";
const telegramClientSecret =
  process.env.TELEGRAM_OIDC_CLIENT_SECRET ?? "playwright-telegram-secret";
const telegramRedirectUri = process.env.TELEGRAM_OIDC_REDIRECT_URI ?? `${appOrigin}/auth/telegram/callback`;
const telegramDiscoveryUrl =
  process.env.TELEGRAM_OIDC_DISCOVERY_URL ??
  `${appOrigin}/api/test/telegram-oidc/discovery`;
const telegramAuthUrl =
  process.env.TELEGRAM_OIDC_AUTH_URL ?? `${appOrigin}/api/test/telegram-oidc/auth`;
const telegramTokenUrl =
  process.env.TELEGRAM_OIDC_TOKEN_URL ?? `${appOrigin}/api/test/telegram-oidc/token`;
const telegramJwksUrl =
  process.env.TELEGRAM_OIDC_JWKS_URL ?? `${appOrigin}/api/test/telegram-oidc/jwks`;
const googleMockOrigin = process.env.GOOGLE_OIDC_MOCK_ORIGIN ?? "http://127.0.0.1:4011";
const googleClientId = process.env.GOOGLE_OIDC_CLIENT_ID ?? "playwright-google-client-id";
const googleClientSecret =
  process.env.GOOGLE_OIDC_CLIENT_SECRET ?? "playwright-google-client-secret";
const googleRedirectUri = process.env.GOOGLE_OIDC_REDIRECT_URI ?? `${appOrigin}/auth/google/callback`;
const googleScopes = process.env.GOOGLE_OIDC_SCOPES ?? "openid email profile";
const googleAuthUrl = process.env.GOOGLE_OIDC_AUTH_URL ?? `${googleMockOrigin}/auth`;
const googleTokenUrl = process.env.GOOGLE_OIDC_TOKEN_URL ?? `${googleMockOrigin}/token`;
const googleJwksUrl = process.env.GOOGLE_OIDC_JWKS_URL ?? `${googleMockOrigin}/jwks`;
const appBaseUrl =
  process.env.PUBLIC_APP_URL ?? process.env.APP_BASE_URL ?? playwrightBaseUrl;

process.env.SESSION_SECRET = sessionSecret;
process.env.TELEGRAM_OIDC_CLIENT_ID = telegramClientId;
process.env.GOOGLE_OIDC_CLIENT_ID = googleClientId;
process.env.TELEGRAM_OIDC_REDIRECT_URI = telegramRedirectUri;
process.env.GOOGLE_OIDC_REDIRECT_URI = googleRedirectUri;

export default defineConfig({
  testDir: "tests",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: playwrightBaseUrl,
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
    command: `pnpm exec next dev -p ${playwrightPort}`,
    url: playwrightBaseUrl,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      PLAYWRIGHT_BASE_URL: playwrightBaseUrl,
      PLAYWRIGHT_PORT: playwrightPort,
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
      PLAYWRIGHT_TEST: "1",
    },
  },
});
