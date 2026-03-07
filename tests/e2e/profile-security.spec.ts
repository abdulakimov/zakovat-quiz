import { expect, test } from "@playwright/test";
import fs from "fs/promises";
import path from "path";
import { SignJWT } from "jose";

const SESSION_COOKIE_NAME = "zakovat_session";
const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
const APP_BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

async function authSession(page: import("@playwright/test").Page) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set in environment.");
  const userPath = path.join(process.cwd(), ".tmp-tests", "playwright-user.json");
  const raw = await fs.readFile(userPath, "utf-8");
  const user = JSON.parse(raw) as { id: string; username: string; name: string | null };

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
      value: "en",
      url: `${APP_BASE_URL}/`,
      sameSite: "Lax",
    },
  ]);
}

test("security new password input keeps focus while typing", async ({ page }) => {
  await authSession(page);
  await page.goto("/en/app/profile?tab=security");

  const securityTab = page.getByRole("tab", { name: /security/i });
  if (await securityTab.isVisible()) {
    await securityTab.click();
  }

  const newPasswordInput = page.locator("#profile-new-password");
  await expect(newPasswordInput).toBeVisible();

  await newPasswordInput.click();
  await page.keyboard.type("abcdef1234");
  await expect(newPasswordInput).toHaveValue("abcdef1234");

  const activeElementId = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.id ?? "");
  expect(activeElementId).toBe("profile-new-password");
});

test("security password save gating updates for invalid and valid inputs", async ({ page }) => {
  await authSession(page);
  await page.goto("/en/app/profile?tab=security");

  const securityTab = page.getByRole("tab", { name: /security/i });
  if (await securityTab.isVisible()) {
    await securityTab.click();
  }

  const currentPasswordInput = page.locator("#profile-current-password");
  if (await currentPasswordInput.isVisible()) {
    await currentPasswordInput.fill("pw12345678");
  }

  const newPasswordInput = page.locator("#profile-new-password");
  const confirmPasswordInput = page.locator("#profile-confirm-password");
  await newPasswordInput.fill("abcdefghij");
  await confirmPasswordInput.fill("abcdefghij");

  const saveButton = page.getByRole("button", { name: /^save$/i });
  await expect(saveButton).toBeVisible();
  await expect(saveButton).toBeDisabled();
  await expect(page.getByTestId("security-save-hint")).toBeVisible();
  await expect(page.getByTestId("security-save-hint")).toContainText("add a number");

  await newPasswordInput.fill("abcde12345");
  await confirmPasswordInput.fill("abcde12345");

  await expect(saveButton).toBeEnabled();
  await expect(page.getByTestId("security-save-hint")).toHaveCount(0);
});
