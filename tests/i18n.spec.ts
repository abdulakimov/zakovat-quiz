import fs from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import { expect, test } from "@playwright/test";

const SESSION_COOKIE_NAME = "zakovat_session";
const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
const prisma = new PrismaClient();

type TestUser = { id: string; username: string; name: string | null };

async function readTestUser(): Promise<TestUser> {
  const userPath = path.join(process.cwd(), ".tmp-tests", "playwright-user.json");
  const raw = await fs.readFile(userPath, "utf-8");
  return JSON.parse(raw) as TestUser;
}

async function authSession(page: import("@playwright/test").Page, locale: "uz" | "ru" | "en" = "uz") {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set in environment.");

  const user = await readTestUser();

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
      value: locale,
      url: "http://localhost:3000/",
      sameSite: "Lax",
    },
  ]);

  return user;
}

async function createPackWithRound(userId: string) {
  const nonce = Date.now();
  const pack = await prisma.pack.create({
    data: {
      ownerId: userId,
      title: `i18n-pack-${nonce}`,
      description: "i18n test pack",
      visibility: "DRAFT",
      breakTimerSec: 60,
    },
    select: { id: true },
  });

  await prisma.round.create({
    data: {
      packId: pack.id,
      order: 1,
      title: "Round 1",
      defaultTimerSec: 60,
      defaultQuestionType: "IMAGE",
    },
  });

  return pack.id;
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("switch locale to ru on pack page localizes tabs/buttons/badges", async ({ page }) => {
  const user = await authSession(page, "uz");
  const packId = await createPackWithRound(user.id);

  await page.goto(`/uz/app/packs/${packId}?tab=rounds`);
  await page.getByTestId("lang-switcher").click();
  await page.getByTestId("lang-ru").click();

  await expect(page).toHaveURL(new RegExp(`/ru/app/packs/${packId}`));
  await expect(page.getByTestId("tab-rounds")).toContainText("Раунды");
  await expect(page.getByTestId("tab-settings")).toContainText("Настройки");
  await expect(page.getByTestId("btn-add-round")).toContainText("Добавить раунд");
  await expect(page.getByTestId("btn-reorder")).toContainText("Сортировать");
  await expect(page.getByTestId("btn-generate-template")).toContainText("Сгенерировать шаблон Zakovat");
  await expect(page.getByTestId("badge-status").first()).toContainText("Черновик");
  await expect(page.getByTestId("roundtype-badge").first()).toContainText("Изображение");
});

test("switch locale to en on pack page localizes tabs/buttons/badges", async ({ page }) => {
  const user = await authSession(page, "uz");
  const packId = await createPackWithRound(user.id);

  await page.goto(`/uz/app/packs/${packId}?tab=rounds`);
  await page.getByTestId("lang-switcher").click();
  await page.getByTestId("lang-en").click();

  await expect(page).toHaveURL(new RegExp(`/en/app/packs/${packId}`));
  await expect(page.getByTestId("tab-rounds")).toContainText("Rounds");
  await expect(page.getByTestId("tab-settings")).toContainText("Settings");
  await expect(page.getByTestId("btn-add-round")).toContainText("Add round");
  await expect(page.getByTestId("btn-reorder")).toContainText("Reorder");
  await expect(page.getByTestId("btn-generate-template")).toContainText("Generate Zakovat template");
  await expect(page.getByTestId("badge-status").first()).toContainText("Draft");
  await expect(page.getByTestId("roundtype-badge").first()).toContainText("Image");
});

test("locale persists across navigation from packs to profile", async ({ page }) => {
  const user = await authSession(page, "uz");
  const packId = await createPackWithRound(user.id);

  await page.goto(`/uz/app/packs/${packId}`);
  await page.getByTestId("lang-switcher").click();
  await page.getByTestId("lang-ru").click();
  await expect(page).toHaveURL(new RegExp(`/ru/app/packs/${packId}`));

  await page.getByRole("button", { name: /Playwright User|@playwright/ }).click();
  await page.getByRole("menuitem", { name: "Профиль" }).click();

  await expect(page).toHaveURL(/\/ru\/app\/profile/);
});

test("no console errors on pack page load", async ({ page }) => {
  const user = await authSession(page, "uz");
  const packId = await createPackWithRound(user.id);
  const errors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  await page.goto(`/uz/app/packs/${packId}?tab=rounds`);
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);
});
