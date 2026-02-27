import fs from "fs/promises";
import path from "path";
import { SignJWT } from "jose";
import { expect, test } from "@playwright/test";

const SESSION_COOKIE_NAME = "zakovat_session";
const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

type TestUser = { id: string; username: string; name: string | null };

async function readTestUser(): Promise<TestUser> {
  const userPath = path.join(process.cwd(), ".tmp-tests", "playwright-user.json");
  const raw = await fs.readFile(userPath, "utf-8");
  return JSON.parse(raw) as TestUser;
}

async function authSession(page: import("@playwright/test").Page, locale: "uz" | "ru" | "en" = "en") {
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
      url: "http://localhost:3000/",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: LOCALE_COOKIE_NAME,
      value: locale,
      url: "http://localhost:3000/",
      sameSite: "Lax",
    },
  ]);
}

test("default theme follows system when no preference is stored", async ({ page }) => {
  await authSession(page, "en");
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => window.localStorage.removeItem("theme"));

  await page.goto("/en/app");
  await expect(page.getByTestId("theme-switcher")).toContainText("System");
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("switching to dark updates html class and persists after reload", async ({ page }) => {
  await authSession(page, "en");

  await page.goto("/en/app");
  await page.getByTestId("theme-switcher").click();
  await page.getByTestId("theme-dark").click();

  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("theme"))).toBe("dark");

  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("switching to light removes dark class and persists after navigation", async ({ page }) => {
  await authSession(page, "en");

  await page.goto("/en/app");
  await page.getByTestId("theme-switcher").click();
  await page.getByTestId("theme-light").click();

  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(false);
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("theme"))).toBe("light");

  await page.goto("/en/app/settings");
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(false);
});

test("system mode reacts to prefers-color-scheme changes", async ({ page }) => {
  await authSession(page, "en");
  await page.emulateMedia({ colorScheme: "light" });

  await page.goto("/en/app");
  await page.getByTestId("theme-switcher").click();
  await page.getByTestId("theme-system").click();
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(false);

  await page.emulateMedia({ colorScheme: "dark" });
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);
});

test("no console errors on load with theme controls", async ({ page }) => {
  await authSession(page, "en");
  const errors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  await page.goto("/en/app");
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("theme-switcher")).toBeVisible();
  expect(errors).toEqual([]);
});
