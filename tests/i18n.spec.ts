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

async function createTeamForUser(userId: string) {
  const nonce = Date.now();
  const team = await prisma.team.create({
    data: {
      name: `i18n-team-${nonce}`,
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

async function switchLocale(page: import("@playwright/test").Page, locale: "uz" | "ru" | "en") {
  await page.getByTestId("lang-switcher").click();
  const item = page.getByTestId(`lang-${locale}`);
  await expect(item).toBeVisible();
  await item.click();
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("redirects / to /uz and /auth/login to /uz/auth/login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/uz(\/|$)/);

  await page.goto("/auth/login");
  await expect(page).toHaveURL(/\/uz\/auth\/login/);
});

test("switching language on teams updates URL and translated UI", async ({ page }) => {
  const user = await authSession(page, "uz");
  await createTeamForUser(user.id);

  await page.goto("/uz/app/teams");
  await expect(page.getByTestId("teams-heading")).toContainText("Jamoalar");

  await switchLocale(page, "ru");

  await expect(page).toHaveURL(/\/ru\/app\/teams/);
  await expect(page.getByTestId("teams-heading")).not.toContainText("Jamoalar");
});

test("locale persists across navigation to settings and presenter", async ({ page }) => {
  const user = await authSession(page, "uz");
  const packId = await createPackWithRound(user.id);

  await page.goto("/uz/app/teams");
  await switchLocale(page, "ru");
  await expect(page).toHaveURL(/\/ru\/app\/teams/);

  await page.goto("/app/settings");
  await expect(page).toHaveURL(/\/ru\/app\/settings/);
  await expect(page.getByTestId("settings-heading")).not.toContainText("Sozlamalar");

  await page.goto(`/app/presenter/${packId}`);
  await expect(page).toHaveURL(new RegExp(`/ru/app/presenter/${packId}`));
  await expect(page.getByTestId("presenter-heading")).toBeVisible();
});

test("auth signup page renders translated heading by locale", async ({ page }) => {
  await page.goto("/uz/auth/signup");
  const uzText = (await page.getByTestId("signup-heading").textContent()) ?? "";
  expect(uzText.length).toBeGreaterThan(0);

  await page.goto("/ru/auth/signup");
  const ruText = (await page.getByTestId("signup-heading").textContent()) ?? "";
  expect(ruText.length).toBeGreaterThan(0);
  expect(ruText).not.toEqual(uzText);
});

test("no console errors on localized app routes", async ({ page }) => {
  const user = await authSession(page, "ru");
  await createTeamForUser(user.id);

  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  await page.goto("/ru/app");
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);
});
