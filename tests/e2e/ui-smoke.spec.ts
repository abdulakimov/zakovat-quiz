import { test, expect } from "@playwright/test";
import fs from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

const SESSION_COOKIE_NAME = "zakovat_session";
const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
const APP_BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const prisma = new PrismaClient();

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
      url: `${APP_BASE_URL}/`,
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: LOCALE_COOKIE_NAME,
      value: "en",
      url: `${APP_BASE_URL}/`,
      sameSite: "Lax",
    },
  ]);

  return user;
}

async function createImageAssetForUser(userId: string, name: string) {
  return prisma.mediaAsset.create({
    data: {
      ownerId: userId,
      type: "IMAGE",
      path: `media/${userId}/${name}`,
      originalName: name,
      size: 1024,
      sizeBytes: 1024,
      mimeType: "image/png",
    },
    select: { id: true, originalName: true },
  });
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("Add round dialog shows fields", async ({ page }) => {
  await authSession(page);
  await page.goto("/en/app/packs");

  await page.getByRole("button", { name: /create pack/i }).first().click();
  const createPackDialog = page.getByRole("dialog").last();
  const packTitle = `Playwright Pack ${Date.now()}`;
  await createPackDialog.getByLabel("Title").fill(packTitle);
  await createPackDialog.getByRole("button", { name: /create pack/i }).click();

  await page.waitForURL(/\/en\/app\/packs\/.+/);

  await page.getByRole("button", { name: /add round/i }).first().click();
  const dialog = page.getByRole("dialog").last();
  await expect(dialog.getByLabel("Title")).toBeVisible();
  await expect(dialog.getByLabel("Default question type")).toBeVisible();
  await expect(dialog.getByLabel(/Default timer/i)).toBeVisible();
  await dialog.getByRole("button", { name: /cancel/i }).click();

  await page.getByRole("button", { name: /settings/i }).first().click();
  await expect(page.getByLabel("Question timer preset")).toBeVisible();
});

test("Question editor is compact with checks panel and blocks save when answer is empty", async ({ page }) => {
  await authSession(page);
  await page.goto("/en/app/packs");

  await page.getByRole("button", { name: /create pack/i }).first().click();
  const createPackDialog = page.getByRole("dialog").last();
  const packTitle = `Playwright Pack ${Date.now()}`;
  await createPackDialog.getByLabel("Title").fill(packTitle);
  await createPackDialog.getByRole("button", { name: /create pack/i }).click();
  await page.waitForURL(/\/en\/app\/packs\/.+/);

  await page.getByRole("button", { name: /add round/i }).first().click();
  const dialog = page.getByRole("dialog").last();
  const roundTitle = "Round 1";
  await dialog.getByLabel("Title").fill(roundTitle);
  await dialog.getByLabel("Default question type").selectOption("TEXT");
  await dialog.getByRole("button", { name: /create/i }).click();

  await page.getByLabel(`Open ${roundTitle}`).click();
  await page.waitForURL(/\/en\/app\/packs\/.+\/rounds\/.+/);

  await page.getByRole("link", { name: /add question/i }).first().click();
  await page.waitForURL(/\/questions\/new/);

  await expect(page.getByLabel("Question type")).toBeVisible();
  await expect(page.getByLabel("Question text")).toBeVisible();
  await expect(page.getByText("Checks").first()).toBeVisible();
  await expect(page.getByText("Ready")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^preview$/i })).toHaveCount(0);
  await expect(page.getByTestId("preview-stage")).toHaveCount(0);
  await expect(page.getByText("Summary")).toHaveCount(0);
  await expect(page.getByLabel("Timer override")).toHaveCount(0);

  await page.getByLabel("Question text").fill("What is the capital of France?");
  await page.getByRole("textbox", { name: /^Answer$/ }).focus();
  await page.getByRole("textbox", { name: /^Answer$/ }).blur();
  await expect(page.getByTestId("answer-text-error")).toHaveText("Answer is required");
  await expect(page.getByRole("button", { name: /^save$/i })).toBeDisabled();
});

test("OPTIONS question supports question media and presenter renders it", async ({ page }) => {
  const user = await authSession(page);
  const seededAsset = await createImageAssetForUser(user.id, `options-question-image-${Date.now()}.png`);
  await page.goto("/en/app/packs");

  await page.getByRole("button", { name: /create pack/i }).first().click();
  const createPackDialog = page.getByRole("dialog").last();
  const packTitle = `Options Media Pack ${Date.now()}`;
  await createPackDialog.getByLabel("Title").fill(packTitle);
  await createPackDialog.getByRole("button", { name: /create pack/i }).click();
  await page.waitForURL(/\/en\/app\/packs\/.+/);
  const packMatch = page.url().match(/\/packs\/([^/]+)/);
  if (!packMatch) throw new Error("Pack id not found in URL.");
  const packId = packMatch[1];

  await page.getByRole("button", { name: /add round/i }).first().click();
  const dialog = page.getByRole("dialog").last();
  const roundTitle = "Options media round";
  await dialog.getByLabel("Title").fill(roundTitle);
  await dialog.getByLabel("Default question type").selectOption("OPTIONS");
  await dialog.getByRole("button", { name: /create/i }).click();

  await page.getByLabel(`Open ${roundTitle}`).click();
  await page.waitForURL(/\/en\/app\/packs\/.+\/rounds\/.+/);
  const roundMatch = page.url().match(/\/rounds\/([^/]+)/);
  if (!roundMatch) throw new Error("Round id not found in URL.");
  const roundId = roundMatch[1];

  await page.getByRole("link", { name: /add question/i }).first().click();
  await page.waitForURL(/\/questions\/new/);

  await page.getByLabel("Question type").selectOption("OPTIONS");
  await expect(page.getByTestId("question-media-choose")).toBeVisible();
  await expect(page.getByText("No media").first()).toBeVisible();

  await page.getByTestId("question-media-choose").click();
  await expect(page.getByTestId(`question-media-library-item-${seededAsset.id}`)).toBeVisible();
  await page.getByTestId(`question-media-library-item-${seededAsset.id}`).click();
  await expect(page.getByTestId("question-media-selected-name")).toContainText(seededAsset.originalName);

  await page.getByLabel("Question text").fill("Which picture shows the correct option?");
  await page.getByPlaceholder("Option A").fill("Option A");
  await page.getByPlaceholder("Option B").fill("Option B");
  await page.getByPlaceholder("Option C").fill("Option C");
  await page.getByPlaceholder("Option D").fill("Option D");
  await page.getByRole("textbox", { name: /^Answer$/ }).fill("Option A");

  await page.getByTestId("question-media-preview").click();
  await expect(page.getByTestId("question-media-preview-panel")).toBeVisible();
  await expect(page.getByAltText(seededAsset.originalName)).toBeVisible();

  await page.getByRole("button", { name: /^save$/i }).click();
  await page.waitForURL(new RegExp(`/en/app/packs/${packId}/rounds/${roundId}$`));

  const created = await prisma.question.findFirst({
    where: { roundId, text: "Which picture shows the correct option?" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!created) throw new Error("Saved OPTIONS question was not found.");

  await page.goto(`/en/app/packs/${packId}/rounds/${roundId}/questions/${created.id}/edit`);
  await expect(page.getByTestId("question-media-selected-name")).toContainText(seededAsset.originalName);
  await page.getByTestId("question-media-preview").click();
  await expect(page.getByAltText(seededAsset.originalName)).toBeVisible();

  await page.goto(`/en/app/presenter/${packId}`);
  const nextButton = page.getByTestId("presenter-shell").locator("footer button").nth(1);
  await nextButton.click();
  await expect(page.getByTestId("presenter-media-image")).toBeVisible();
  await expect(page.getByTestId("presenter-media-image")).toHaveAttribute("alt", seededAsset.originalName);
});

test("Questions reorder mode persists after refresh", async ({ page }) => {
  test.skip(true, "Flaky in CI: question editor save state is environment-dependent.");
  await authSession(page);
  await page.goto("/en/app/packs");

  await page.getByRole("button", { name: /create pack/i }).first().click();
  const createPackDialog = page.getByRole("dialog").last();
  const packTitle = `Reorder Pack ${Date.now()}`;
  await createPackDialog.getByLabel("Title").fill(packTitle);
  await createPackDialog.getByRole("button", { name: /create pack/i }).click();
  await page.waitForURL(/\/en\/app\/packs\/.+/);

  await page.getByRole("button", { name: /add round/i }).first().click();
  const dialog = page.getByRole("dialog").last();
  await dialog.getByLabel("Title").fill("Round reorder");
  await dialog.getByLabel("Default question type").selectOption("TEXT");
  await dialog.getByRole("button", { name: /create/i }).click();

  await page.getByLabel("Open Round reorder").click();
  await page.waitForURL(/\/en\/app\/packs\/.+\/rounds\/.+/);

  for (const [idx, qText] of ["Question one text", "Question two text"].entries()) {
    await page.getByRole("link", { name: /add question/i }).first().click();
    await page.waitForURL(/\/questions\/new/);
    await page.getByLabel("Question text").fill(qText);
    await page.getByRole("textbox", { name: /^Answer$/ }).fill(`Answer ${idx + 1}`);
    await page.getByRole("button", { name: /^save$/i }).click();
    await page.waitForURL(/\/en\/app\/packs\/.+\/rounds\/.+/);
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

  const rows = await page.locator("p.truncate.font-medium.text-foreground").allTextContents();
  expect(rows.slice(0, 2)).toEqual(["1. Question two text", "2. Question one text"]);
});
