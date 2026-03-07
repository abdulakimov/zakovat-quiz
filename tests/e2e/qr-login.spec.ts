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
    expect(shellBox.width).toBeLessThanOrEqual(1248);
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
  await expect(page.getByTestId("qr-title")).toBeVisible();
  await expect(page.getByTestId("qr-frame").getByTestId("qr-title")).toBeVisible();
  await expect(page.getByTestId("qr-frame").getByTestId("qr-subtitle")).toBeVisible();
  await expect(page.getByTestId("qr-frame")).toBeVisible();
  await expect(page.getByTestId("left-header")).toBeVisible();
  await expect(page.getByTestId("auth-right").locator('[data-testid="qr-panel"]')).toBeVisible();
  await expect(page.getByTestId("auth-left").locator('[data-testid="qr-panel"]')).toHaveCount(0);
  const leftTextAlign = await page.getByTestId("left-header").evaluate((node) => getComputedStyle(node).textAlign);
  expect(leftTextAlign).toBe("center");
  const leftBox = await page.getByTestId("auth-left").boundingBox();
  const leftInnerBox = await page.getByTestId("left-inner").boundingBox();
  expect(leftBox).not.toBeNull();
  expect(leftInnerBox).not.toBeNull();
  if (leftBox && leftInnerBox) {
    const leftCenter = leftBox.x + leftBox.width / 2;
    const innerCenter = leftInnerBox.x + leftInnerBox.width / 2;
    expect(Math.abs(leftCenter - innerCenter)).toBeLessThanOrEqual(16);
  }
  const tileBox = await page.getByTestId("qr-tile").boundingBox();
  const qrTitleBox = await page.getByTestId("qr-frame").getByTestId("qr-title").boundingBox();
  expect(tileBox).not.toBeNull();
  expect(qrTitleBox).not.toBeNull();
  if (tileBox && qrTitleBox) {
    expect(tileBox.y + tileBox.height).toBeLessThan(qrTitleBox.y);
  }
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
  await expect(page.getByTestId("qr-restart")).toHaveCount(0);
  await expect
    .poll(async () => (await page.getByTestId("qr-panel").getAttribute("data-session-id")) ?? "")
    .not.toEqual(sid);
});
