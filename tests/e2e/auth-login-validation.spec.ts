import { expect, test } from "@playwright/test";

test("login page renders social buttons and no console errors", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/en/auth/login");
  await expect(page.getByTestId("provider-telegram")).toBeVisible();
  await expect(page.getByTestId("provider-google")).toBeVisible();
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

test("provider buttons use full document navigation", async ({ page }) => {
  const navigations: string[] = [];

  page.on("request", (request) => {
    if (request.isNavigationRequest() && request.resourceType() === "document") {
      navigations.push(request.url());
    }
  });

  await page.route("**/auth/google/start", async (route) => {
    await route.fulfill({ status: 200, contentType: "text/html", body: "<html><body>google start</body></html>" });
  });
  await page.goto("/en/auth/login");
  await page.getByTestId("google-login").click();
  await page.waitForURL("**/auth/google/start");
  expect(navigations.some((url) => url.includes("/auth/google/start"))).toBeTruthy();

  await page.route("**/auth/telegram/start", async (route) => {
    await route.fulfill({ status: 200, contentType: "text/html", body: "<html><body>telegram start</body></html>" });
  });
  await page.goto("/en/auth/login");
  await page.getByTestId("telegram-login").click();
  await page.waitForURL("**/auth/telegram/start");
  expect(navigations.some((url) => url.includes("/auth/telegram/start"))).toBeTruthy();
});

test("mobile auth layout hides visual panel", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/auth/login");
  await expect(page.getByTestId("auth-right")).toBeHidden();
  await expect(page.getByTestId("auth-left")).toBeVisible();
});

test("signup route redirects to login with disabled message", async ({ page }) => {
  await page.goto("/uz/auth/signup");
  await expect(page).toHaveURL(/\/uz\/auth\/login\?info=signup_disabled/);
  await expect(page.getByTestId("signup-disabled-info")).toContainText("Ro‘yxatdan o‘tish talab qilinmaydi");
});

test("login page does not render signup link", async ({ page }) => {
  await page.goto("/en/auth/login");
  await expect(page.getByRole("link", { name: /sign up|create account|ro'yxatdan|регистрация/i })).toHaveCount(0);
});

test("auth background renders without console errors", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/en/auth/login");
  await expect(page.getByTestId("auth-background")).toBeVisible();
  await expect(consoleErrors).toEqual([]);
});

test.describe("reduced motion auth background", () => {
  test("disables motion animations", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en/auth/login");
    const prefersReduced = await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    expect(prefersReduced).toBeTruthy();
    const animationName = await page
      .locator(".auth-float-slow")
      .first()
      .evaluate((node) => getComputedStyle(node).animationName);
    expect(animationName).toBe("none");
  });
});
