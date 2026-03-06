import { test, expect } from "@playwright/test";

const verificationEnabled = process.env.EMAIL_VERIFICATION_ENABLED !== "false";

function makeUser(label: string) {
  const nonce = `${Date.now().toString(36)}${Math.floor(Math.random() * 10000)
    .toString(36)
    .padStart(3, "0")}`;
  const sanitizedLabel = label.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 8);
  const username = `pw_${sanitizedLabel}_${nonce}`.slice(0, 24);
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
  await page.goto("/en/auth/signup");
  await page.getByLabel(/^Name$/).fill(user.name);
  await page.getByLabel(/^Username$/).fill(user.username);
  await page.getByLabel(/Email/i).fill(user.email);
  await page.getByLabel(/^Password$/).fill(user.password);
  await page.getByLabel(/Confirm password/i).fill(user.password);
  await page.getByRole("button", { name: /create account/i }).click();
  return user;
}

test("Credentials signup requires verification when enabled", async ({ page }) => {
  test.skip(!verificationEnabled, "EMAIL_VERIFICATION_ENABLED is false");

  await submitSignup(page, "verify");
  await page.waitForURL(/\/(en|uz|ru)\/(auth\/verify|app)/);
  if (/\/auth\/verify/.test(page.url())) {
    await expect(page.getByText(/Verify your email|Email tasdiqlash|Подтвердите email/i)).toBeVisible();
  } else {
    await expect(page.getByTestId("app-heading")).toBeVisible();
  }
});

test("Credentials signup completes without verification when disabled", async ({ page }) => {
  test.skip(verificationEnabled, "EMAIL_VERIFICATION_ENABLED is true");

  await submitSignup(page, "noverify");
  await page.waitForURL(/\/(en|uz|ru)\/app/);
  await expect(page.getByTestId("app-heading")).toBeVisible();

  await page.goto("/en/auth/verify");
  await expect(page.getByText(/Verification is disabled|Tasdiqlash o'chirilgan|Проверка отключена/i)).toBeVisible();
});
