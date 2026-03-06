import { expect, test } from "@playwright/test";
import fs from "fs/promises";
import path from "path";
import { SignJWT } from "jose";

const SESSION_COOKIE_NAME = "zakovat_session";
const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

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
      url: "http://localhost:3000/",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: LOCALE_COOKIE_NAME,
      value: "en",
      url: "http://localhost:3000/",
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
