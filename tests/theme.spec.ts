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

async function authSession(page: import("@playwright/test").Page, locale: "uz" | "ru" | "en" = "en") {
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

async function createTeamForUser(userId: string) {
  const nonce = Date.now();
  const team = await prisma.team.create({
    data: {
      name: `theme-team-${nonce}`,
      ownerId: userId,
      members: {
        create: {
          userId,
          role: "OWNER",
          status: "ACTIVE",
        },
      },
    },
    select: { id: true },
  });

  return team.id;
}

async function createPackWithRoundAndQuestion(userId: string) {
  const nonce = Date.now();
  const pack = await prisma.pack.create({
    data: {
      ownerId: userId,
      title: `theme-pack-${nonce}`,
      description: "theme test pack",
      visibility: "DRAFT",
      breakTimerSec: 60,
    },
    select: { id: true },
  });

  const round = await prisma.round.create({
    data: {
      packId: pack.id,
      order: 1,
      title: "Round 1",
      defaultTimerSec: 60,
      defaultQuestionType: "TEXT",
    },
    select: { id: true },
  });

  await prisma.question.create({
    data: {
      roundId: round.id,
      order: 1,
      type: "TEXT",
      answerType: "TEXT",
      text: "Theme test question",
      answer: "Answer",
      answerText: "Answer",
    },
  });

  return { packId: pack.id, roundId: round.id };
}

async function getBackgroundColor(locator: import("@playwright/test").Locator) {
  return locator.evaluate((el) => window.getComputedStyle(el).backgroundColor);
}

async function expectNotWhiteBackground(locator: import("@playwright/test").Locator) {
  const color = await getBackgroundColor(locator);
  expect(color).not.toBe("rgb(255, 255, 255)");
  expect(color).not.toBe("rgba(0, 0, 0, 0)");
}

async function expectNotDarkBackground(locator: import("@playwright/test").Locator) {
  const color = await getBackgroundColor(locator);
  expect(color).not.toBe("rgb(0, 0, 0)");
  expect(color).not.toBe("rgba(0, 0, 0, 0)");
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("default theme follows system when no preference is stored", async ({ page }) => {
  await authSession(page, "en");
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => window.localStorage.removeItem("theme"));

  await page.goto("/en/app");
  await expect(page.getByTestId("theme-switcher")).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("switching to dark updates html class and persists after reload", async ({ page }) => {
  await authSession(page, "en");

  await page.goto("/en/app");
  await page.getByTestId("theme-switcher").click();
  await page.getByTestId("theme-dark").click();

  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("theme"))).toBe("dark");

  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("switching to light removes dark class and persists after navigation", async ({ page }) => {
  await authSession(page, "en");

  await page.goto("/en/app");
  await page.getByTestId("theme-switcher").click();
  await page.getByTestId("theme-light").click();

  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(false);
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("theme"))).toBe("light");

  await page.goto("/en/app/settings");
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(false);
});

test("system mode reacts to prefers-color-scheme changes", async ({ page }) => {
  await authSession(page, "en");
  await page.emulateMedia({ colorScheme: "light" });

  await page.goto("/en/app");
  await page.getByTestId("theme-switcher").click();
  await page.getByTestId("theme-system").click();
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(false);

  await page.emulateMedia({ colorScheme: "dark" });
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);
});

test("no console errors on load with theme controls", async ({ page }) => {
  await authSession(page, "en");
  const errors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  await page.goto("/en/app");
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("theme-switcher")).toBeVisible();
  expect(errors).toEqual([]);
});

test("dark theme renders non-white surfaces across key pages", async ({ page }) => {
  const user = await authSession(page, "en");
  await createTeamForUser(user.id);
  const { packId, roundId } = await createPackWithRoundAndQuestion(user.id);

  await page.addInitScript(() => window.localStorage.setItem("theme", "dark"));

  await page.goto("/en/app/teams");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expectNotWhiteBackground(page.getByTestId("app-shell"));
  await expectNotWhiteBackground(page.getByTestId("teams-card").first());

  await page.getByTestId("theme-switcher").click();
  const themeMenu = page.getByRole("menu");
  await expect(themeMenu).toBeVisible();
  await expectNotWhiteBackground(themeMenu);

  await page.goto("/en/app/packs");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expectNotWhiteBackground(page.getByTestId("packs-card").first());

  await page.goto(`/en/app/packs/${packId}`);
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expectNotWhiteBackground(page.getByTestId("round-card").first());

  await page.goto(`/en/app/packs/${packId}/rounds/${roundId}`);
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expectNotWhiteBackground(page.getByTestId("round-header-card"));

  await page.goto(`/en/app/packs/${packId}/rounds/${roundId}/questions/new`);
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expectNotWhiteBackground(page.getByTestId("question-checks-card"));

  await page.goto(`/en/app/presenter/${packId}`);
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expectNotWhiteBackground(page.getByTestId("presenter-shell"));
  await expectNotWhiteBackground(page.getByTestId("presenter-stage"));
});

test("light theme keeps backgrounds readable", async ({ page }) => {
  await authSession(page, "en");
  await page.addInitScript(() => window.localStorage.setItem("theme", "light"));

  await page.goto("/en/app");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expectNotDarkBackground(page.getByTestId("app-shell"));
});
