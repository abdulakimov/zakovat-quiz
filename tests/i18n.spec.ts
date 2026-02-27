import fs from "fs/promises";
import path from "path";
import { SignJWT } from "jose";
import { expect, test } from "@playwright/test";

const SESSION_COOKIE_NAME = "zakovat_session";

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
  ]);
}

test("redirects / to /uz", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL(/\/uz(\/|$)/);
  await expect(page).toHaveURL(/\/uz(\/|$)/);
});

test("switch language to ru changes strings", async ({ page }) => {
  await authSession(page);
  await page.goto("/uz/app/profile?tab=profile");
  await expect(page.getByText("Profil ma'lumotlari")).toBeVisible();

  await page.getByTestId("lang-switcher").click();
  await page.getByTestId("lang-ru").click();

  await expect(page).toHaveURL(/\/ru\/app\/profile/);
  await expect(page.getByText("Данные профиля")).toBeVisible();
});

test("switch to en persists across navigation", async ({ page }) => {
  await authSession(page);
  await page.goto("/uz/app/profile?tab=profile");

  await page.getByTestId("lang-switcher").click();
  await page.getByTestId("lang-en").click();
  await expect(page).toHaveURL(/\/en\/app\/profile/);

  await page.getByRole("link", { name: "Packs" }).click();
  await expect(page).toHaveURL(/\/en\/app\/packs/);
  await expect(page.getByRole("link", { name: "Packs" })).toBeVisible();
});

test("no console errors", async ({ page }) => {
  await authSession(page);
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  await page.goto("/uz/app/profile?tab=profile");
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);
});
