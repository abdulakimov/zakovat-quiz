import { test, expect } from "@playwright/test";

const verificationEnabled = process.env.EMAIL_VERIFICATION_ENABLED !== "false";

function makeUser(label: string) {
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const username = `pw_${label}_${nonce}`.replace(/[^a-zA-Z0-9_-]/g, "_");
  const email = `${username}@example.com`;
  return {
    name: "Playwright User",
    username,
    email,
    password: "Testpass1234",
  };
}

async function submitSignup(page: import("@playwright/test").Page, label: string) {
  const user = makeUser(label);
  await page.goto("/auth/signup");
  await page.getByLabel(/^Name$/).fill(user.name);
  await page.getByLabel(/^Username$/).fill(user.username);
  await page.getByLabel(/^Email$/).fill(user.email);
  await page.getByLabel(/^Password$/).fill(user.password);
  await page.getByRole("button", { name: /create account/i }).click();
  return user;
}

test("Credentials signup requires verification when enabled", async ({ page }) => {
  test.skip(!verificationEnabled, "EMAIL_VERIFICATION_ENABLED is false");

  await submitSignup(page, "verify");
  await page.waitForURL(/\/auth\/verify/);
  await expect(page.getByText("Verify your email")).toBeVisible();
});

test("Credentials signup completes without verification when disabled", async ({ page }) => {
  test.skip(verificationEnabled, "EMAIL_VERIFICATION_ENABLED is true");

  await submitSignup(page, "noverify");
  await page.waitForURL(/\/app/);
  await expect(page.getByText("Your workspace")).toBeVisible();

  await page.goto("/auth/verify");
  await expect(page.getByText("Verification is disabled")).toBeVisible();
});
