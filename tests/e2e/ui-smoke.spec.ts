import { test, expect } from "@playwright/test";
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

test("Add round dialog shows fields", async ({ page }) => {
  await authSession(page);
  await page.goto("/app/packs");

  await page.getByRole("button", { name: /create pack/i }).first().click();
  const createPackDialog = page.getByRole("dialog");
  const packTitle = `Playwright Pack ${Date.now()}`;
  await createPackDialog.getByLabel("Title").fill(packTitle);
  await createPackDialog.getByRole("button", { name: /create pack/i }).click();

  await page.waitForURL(/\/app\/packs\/.+/);

  await page.getByRole("button", { name: /add round/i }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Title")).toBeVisible();
  await expect(dialog.getByLabel("Default question type")).toBeVisible();
  await expect(dialog.getByLabel(/Default timer/i)).toBeVisible();
  await dialog.getByRole("button", { name: /cancel/i }).click();

  await page.getByRole("button", { name: /edit/i }).click();
  await page.getByRole("button", { name: /settings/i }).click();
  await expect(page.getByLabel("Question timer preset")).toBeVisible();
});

test("Question editor is compact with checks panel and blocks save when answer is empty", async ({ page }) => {
  await authSession(page);
  await page.goto("/app/packs");

  await page.getByRole("button", { name: /create pack/i }).first().click();
  const createPackDialog = page.getByRole("dialog");
  const packTitle = `Playwright Pack ${Date.now()}`;
  await createPackDialog.getByLabel("Title").fill(packTitle);
  await createPackDialog.getByRole("button", { name: /create pack/i }).click();
  await page.waitForURL(/\/app\/packs\/.+/);

  await page.getByRole("button", { name: /add round/i }).first().click();
  const dialog = page.getByRole("dialog");
  const roundTitle = "Round 1";
  await dialog.getByLabel("Title").fill(roundTitle);
  await dialog.getByRole("button", { name: /create/i }).click();

  await page.getByLabel(`Open ${roundTitle}`).click();
  await page.waitForURL(/\/app\/packs\/.+\/rounds\/.+/);

  await page.getByRole("button", { name: /add question/i }).click();
  await page.waitForURL(/\/questions\/new/);

  await expect(page.getByLabel("Question type")).toBeVisible();
  await expect(page.getByLabel("Question text")).toBeVisible();
  await expect(page.getByText("Checks")).toBeVisible();
  await expect(page.getByText("Ready")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^preview$/i })).toHaveCount(0);
  await expect(page.getByTestId("preview-stage")).toHaveCount(0);
  await expect(page.getByText("Summary")).toHaveCount(0);
  await expect(page.getByLabel("Timer override")).toHaveCount(0);

  await page.getByLabel("Question text").fill("What is the capital of France?");
  await page.getByLabel("Answer").focus();
  await page.getByLabel("Answer").blur();
  await expect(page.getByText("Answer is required")).toBeVisible();
  await expect(page.getByRole("button", { name: /^save$/i })).toBeDisabled();
});

test("Questions reorder mode persists after refresh", async ({ page }) => {
  await authSession(page);
  await page.goto("/app/packs");

  await page.getByRole("button", { name: /create pack/i }).first().click();
  const createPackDialog = page.getByRole("dialog");
  const packTitle = `Reorder Pack ${Date.now()}`;
  await createPackDialog.getByLabel("Title").fill(packTitle);
  await createPackDialog.getByRole("button", { name: /create pack/i }).click();
  await page.waitForURL(/\/app\/packs\/.+/);

  await page.getByRole("button", { name: /add round/i }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill("Round reorder");
  await dialog.getByRole("button", { name: /create/i }).click();

  await page.getByLabel("Open Round reorder").click();
  await page.waitForURL(/\/app\/packs\/.+\/rounds\/.+/);

  for (const [idx, qText] of ["Question one text", "Question two text"].entries()) {
    await page.getByRole("button", { name: /add question/i }).click();
    await page.waitForURL(/\/questions\/new/);
    await page.getByLabel("Question text").fill(qText);
    await page.getByLabel("Answer").fill(`Answer ${idx + 1}`);
    await page.getByRole("button", { name: /^save$/i }).click();
    await page.waitForURL(/\/app\/packs\/.+\/rounds\/.+/);
  }

  await page.getByRole("button", { name: /^reorder$/i }).click();
  await expect(page.getByText(/drag questions to reorder/i)).toBeVisible();

  const q1 = page.locator("p", { hasText: /1\.\s+Question one text/ }).first();
  const q2 = page.locator("p", { hasText: /2\.\s+Question two text/ }).first();
  const q1Box = await q1.boundingBox();
  const q2Box = await q2.boundingBox();
  if (!q1Box || !q2Box) throw new Error("Question row boxes unavailable");

  await page.mouse.move(q2Box.x + 20, q2Box.y + q2Box.height / 2);
  await page.mouse.down();
  await page.mouse.move(q1Box.x + 20, q1Box.y + q1Box.height / 2, { steps: 12 });
  await page.mouse.up();

  await page.getByRole("button", { name: /^done$/i }).click();
  await page.reload();

  const rows = await page.locator("p.truncate.font-medium.text-slate-900").allTextContents();
  expect(rows.slice(0, 2)).toEqual(["1. Question two text", "2. Question one text"]);
});
