import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { TELEGRAM_PROVIDER } from "@/lib/telegram-oidc";

type TelegramClaims = {
  sub: string;
  name?: string;
  preferred_username?: string;
  picture?: string;
  phone_number?: string;
  id?: string | number;
};

function sanitizeUsername(value: string | undefined) {
  const normalized = (value ?? "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (normalized.length >= 3) {
    return normalized;
  }
  return "";
}

async function findUniqueUsername(base: string) {
  const prefix = base.slice(0, 20) || "tg_user";
  let attempt = 0;

  while (attempt < 100) {
    const suffix = attempt === 0 ? "" : `_${attempt}`;
    const candidate = `${prefix}${suffix}`.slice(0, 32);
    const existing = await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } });
    if (!existing) {
      return candidate;
    }
    attempt += 1;
  }

  return `tg_${randomBytes(6).toString("hex")}`;
}

function toMetadataJson(claims: TelegramClaims) {
  return {
    name: claims.name ?? null,
    preferred_username: claims.preferred_username ?? null,
    picture: claims.picture ?? null,
    phone_number: claims.phone_number ?? null,
    id: claims.id ?? null,
  };
}

export async function upsertTelegramUser(claims: TelegramClaims) {
  const providerAccountId = claims.sub;
  const existingRows = await prisma.$queryRaw<Array<{ id: string; userId: string }>>`
    SELECT id, "userId"
    FROM "AuthAccount"
    WHERE provider = ${TELEGRAM_PROVIDER}
      AND "providerAccountId" = ${providerAccountId}
    LIMIT 1
  `;
  const existing = existingRows[0];

  if (existing) {
    const currentUser = await prisma.user.findUnique({
      where: { id: existing.userId },
      select: { name: true },
    });
    const name = claims.name?.trim() || currentUser?.name || null;
    const updatedUser = await prisma.user.update({
      where: { id: existing.userId },
      data: { name },
      select: {
        id: true,
        role: true,
        username: true,
        name: true,
      },
    });

    await prisma.$executeRaw`
      UPDATE "AuthAccount"
      SET metadata = ${JSON.stringify(toMetadataJson(claims))}::jsonb,
          "updatedAt" = NOW()
      WHERE id = ${existing.id}
    `;

    return updatedUser;
  }

  const suggested = sanitizeUsername(claims.preferred_username);
  const username = await findUniqueUsername(suggested || `tg_${providerAccountId}`);
  const email = `telegram_${providerAccountId}@telegram.local`;
  const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);

  try {
    return await prisma.user.create({
      data: {
        username,
        email,
        name: claims.name?.trim() || null,
        passwordHash,
        role: "USER",
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
      },
      select: {
        id: true,
        role: true,
        username: true,
        name: true,
      },
    }).then(async (newUser) => {
      await prisma.$executeRaw`
        INSERT INTO "AuthAccount"
          ("id", provider, "providerAccountId", "userId", metadata, "createdAt", "updatedAt")
        VALUES
          (${randomBytes(12).toString("hex")},
           ${TELEGRAM_PROVIDER},
           ${providerAccountId},
           ${newUser.id},
           ${JSON.stringify(toMetadataJson(claims))}::jsonb,
           NOW(),
           NOW())
      `;
      return newUser;
    });
  } catch (error) {
    logger.error("Telegram user creation failed", {
      providerAccountId,
      error,
    });
    throw error;
  }
}
