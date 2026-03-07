import fs from "fs/promises";
import path from "path";
import { expect, test } from "@playwright/test";

const SESSION_COOKIE = "zakovat_session";

async function getPlaywrightUserId() {
  const raw = await fs.readFile(path.join(process.cwd(), ".tmp-tests", "playwright-user.json"), "utf-8");
  const payload = JSON.parse(raw) as { id: string };
  return payload.id;
}

test("desktop shows QR panel and mobile hides it", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/uz/auth/login");
  await expect(page.getByTestId("auth-shell")).toBeVisible();
  const shellBox = await page.getByTestId("auth-shell").boundingBox();
  expect(shellBox).not.toBeNull();
  if (shellBox) {
    expect(shellBox.width).toBeLessThanOrEqual(1040);
  }
  await expect(page.getByTestId("auth-shell")).not.toHaveClass(/border-2/);
  const shellBorderTopWidth = await page.getByTestId("auth-shell").evaluate((element) => {
    const value = window.getComputedStyle(element).borderTopWidth;
    return Number.parseFloat(value);
  });
  expect(shellBorderTopWidth).toBeLessThanOrEqual(1);
  await expect(page.getByTestId("provider-panel")).toBeVisible();
  await expect(page.getByTestId("provider-telegram")).toBeVisible();
  await expect(page.getByTestId("provider-google")).toBeVisible();
  const qrPanel = page.getByTestId("qr-panel");
  await expect(qrPanel).toBeVisible();
  await expect(page.getByTestId("qr-panel-wrap")).toBeVisible();
  await expect(page.getByTestId("qr-tile")).toBeVisible();
  await expect(page.getByTestId("qr-frame")).toBeVisible();
  await expect(page.getByTestId("left-header")).toBeVisible();
  await expect(page.getByTestId("right-header")).toBeVisible();
  await expect(page.getByTestId("auth-right").locator('[data-testid="qr-panel"]')).toBeVisible();
  await expect(page.getByTestId("auth-left").locator('[data-testid="qr-panel"]')).toHaveCount(0);
  const leftHeaderBox = await page.getByTestId("left-header").boundingBox();
  const rightHeaderBox = await page.getByTestId("right-header").boundingBox();
  expect(leftHeaderBox).not.toBeNull();
  expect(rightHeaderBox).not.toBeNull();
  if (leftHeaderBox && rightHeaderBox) {
    expect(Math.abs(leftHeaderBox.y - rightHeaderBox.y)).toBeLessThanOrEqual(4);
  }
  const leftBox = await page.getByTestId("auth-left").boundingBox();
  const rightBox = await page.getByTestId("auth-right").boundingBox();
  const tileBefore = await page.getByTestId("qr-tile").boundingBox();
  await expect(page.getByTestId("qr-code-image")).toBeVisible();
  const tileAfter = await page.getByTestId("qr-tile").boundingBox();
  expect(tileBefore).not.toBeNull();
  expect(tileAfter).not.toBeNull();
  if (tileBefore && tileAfter) {
    expect(tileAfter.width).toBe(tileBefore.width);
    expect(tileAfter.height).toBe(tileBefore.height);
    expect(Math.round(tileAfter.width)).toBe(240);
    expect(Math.round(tileAfter.height)).toBe(240);
  }

  expect(leftBox).not.toBeNull();
  expect(rightBox).not.toBeNull();
  if (leftBox && rightBox) {
    expect(leftBox.width).toBeLessThan(rightBox.width);
    const ratio = leftBox.width / rightBox.width;
    expect(ratio).toBeGreaterThan(0.7);
    expect(ratio).toBeLessThan(0.9);
  }

  const providerBox = await page.getByTestId("provider-panel").boundingBox();
  const qrBox = await page.getByTestId("qr-panel").boundingBox();
  expect(providerBox).not.toBeNull();
  expect(qrBox).not.toBeNull();
  if (providerBox && qrBox) {
    expect(qrBox.x).toBeGreaterThan(providerBox.x);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/uz/auth/login");
  await expect(page.getByTestId("provider-panel")).toBeVisible();
  await expect(page.getByTestId("auth-right")).toBeHidden();
  await expect(page.getByTestId("qr-panel")).toBeHidden();
  expect(errors).toEqual([]);
});

test("start QR session returns url and login page renders QR image", async ({ page, request }) => {
  const response = await request.post("/auth/qr/start");
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as {
    qrUrl: string;
    qrDataUrl: string;
    expiresAt: string;
    sessionId: string;
  };

  expect(payload.qrUrl).toContain("/auth/qr?t=");
  expect(payload.qrDataUrl.startsWith("data:image/png;base64,")).toBeTruthy();
  expect(payload.sessionId.length).toBeGreaterThan(10);
  expect(Number.isNaN(Date.parse(payload.expiresAt))).toBeFalsy();

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/uz/auth/login");
  await expect(page.getByTestId("qr-code-image")).toBeVisible();
});

test("approved QR session is consumed and redirects desktop to app", async ({ page, request }) => {
  const userId = await getPlaywrightUserId();

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/uz/auth/login");

  await expect
    .poll(async () => (await page.getByTestId("qr-panel").getAttribute("data-session-id")) ?? "")
    .not.toEqual("");
  const sid = (await page.getByTestId("qr-panel").getAttribute("data-session-id")) ?? "";
  expect(sid.length).toBeGreaterThan(0);

  const approveResponse = await request.post("/auth/qr/test-approve", {
    data: {
      sid,
      userId,
    },
  });
  expect(approveResponse.ok()).toBeTruthy();

  await page.waitForURL("**/uz/app");
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find((cookie) => cookie.name === SESSION_COOKIE);
  expect(sessionCookie).toBeDefined();
});

test("expired QR session shows expired state", async ({ page, request }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/uz/auth/login");

  await expect
    .poll(async () => (await page.getByTestId("qr-panel").getAttribute("data-session-id")) ?? "")
    .not.toEqual("");
  const sid = (await page.getByTestId("qr-panel").getAttribute("data-session-id")) ?? "";

  const expireResponse = await request.post("/auth/qr/test-expire", {
    data: { sid },
  });
  expect(expireResponse.ok()).toBeTruthy();

  await expect(page.getByTestId("qr-status-text")).toContainText("muddati tugadi");
  await expect(page.getByTestId("qr-restart")).toBeVisible();
});
