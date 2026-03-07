import fs from "fs/promises";
import path from "path";
import { expect, test } from "@playwright/test";
import { SignJWT } from "jose";

const SESSION_COOKIE_NAME = "zakovat_session";
const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
const APP_BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

type TestUser = { id: string; username: string; name: string | null };

async function readTestUser(): Promise<TestUser> {
  const userPath = path.join(process.cwd(), ".tmp-tests", "playwright-user.json");
  const raw = await fs.readFile(userPath, "utf-8");
  return JSON.parse(raw) as TestUser;
}

async function authSession(page: import("@playwright/test").Page, locale: "uz" | "ru" | "en" = "uz") {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set in environment.");

  const user = await readTestUser();
  const token = await new SignJWT({
    sub: user.id,
    role: "USER",
    username: user.username,
    name: user.name ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(secret));

  await page.context().addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: token,
      url: `${APP_BASE_URL}/`,
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: LOCALE_COOKIE_NAME,
      value: locale,
      url: `${APP_BASE_URL}/`,
      sameSite: "Lax",
    },
  ]);
}

test("logged-out user sees localized landing with CTA buttons", async ({ page }) => {
  await page.goto("/uz");
  await expect(page.getByTestId("landing-title")).toBeVisible();
  await expect(page.getByTestId("cta-start")).toBeVisible();
  await expect(page.getByTestId("cta-login")).toBeVisible();
});

test("logged-out user visiting app is redirected to login with next", async ({ page }) => {
  await page.goto("/en/app");
  await expect(page).toHaveURL(/\/en\/auth\/login\?next=%2Fen%2Fapp/);
});

test("logged-in user sees dashboard CTA on landing", async ({ page }) => {
  await authSession(page, "en");
  await page.goto("/en");
  await expect(page.getByTestId("cta-dashboard")).toBeVisible();
});

test("landing copy changes between locales", async ({ page }) => {
  await page.goto("/uz");
  const uzTitle = await page.getByTestId("landing-title").textContent();

  await page.goto("/en");
  await expect(page).toHaveURL(/\/en$/);

  const enTitle = await page.getByTestId("landing-title").textContent();
  expect(uzTitle).not.toEqual(enTitle);
});

test("landing applies dark mode when theme is set to dark and has no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  await page.addInitScript(() => window.localStorage.setItem("theme", "dark"));
  await page.goto("/en");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);
});
