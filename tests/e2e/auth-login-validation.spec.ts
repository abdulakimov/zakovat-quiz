import { expect, test } from "@playwright/test";

test("login page renders social buttons and no console errors", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/en/auth/login");
  await expect(page.getByTestId("google-login")).toBeVisible();
  await expect(page.getByTestId("telegram-login")).toBeVisible();
  await expect(page.locator('svg[data-icon="google"]')).toBeVisible();
  await expect(page.locator('svg[data-icon="telegram"]')).toBeVisible();
  await expect(page.getByTestId("google-login")).toHaveAttribute("href", "/auth/google/start");
  await expect(page.getByTestId("telegram-login")).toHaveAttribute("href", "/auth/telegram/start");
  await page.getByTestId("google-login").click({ trial: true });
  await page.getByTestId("telegram-login").click({ trial: true });
  await expect(consoleErrors).toEqual([]);
});

test("mobile auth layout hides visual panel", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/auth/login");
  await expect(page.getByTestId("auth-visual-panel")).toBeHidden();
  await expect(page.getByTestId("auth-form-panel")).toBeVisible();
});

test("empty sign in submit shows field errors and does not throw page errors", async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/en/auth/login");
  await page.getByTestId("login-submit").click();

  await expect(page.locator("#usernameOrEmail-error")).toBeVisible();
  await expect(page.locator("#password-error")).toBeVisible();
  await expect(pageErrors).toEqual([]);
  await expect(consoleErrors).toEqual([]);
});
