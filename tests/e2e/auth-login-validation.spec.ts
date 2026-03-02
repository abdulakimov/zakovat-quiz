import { expect, test } from "@playwright/test";

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
