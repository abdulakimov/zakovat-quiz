import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { GOOGLE_PROVIDER, type GoogleIdTokenClaims } from "@/src/auth/providers/google";
import { getInitialProviderImageUrl, getProviderAvatarUpdate } from "@/src/lib/provider-avatar";

function sanitizeUsername(value: string | undefined) {
  const normalized = (value ?? "").trim().toLowerCase().replace(/[^a-z0-9_.]/g, "");
  if (normalized.length >= 3) {
    return normalized;
  }
  return "";
}

async function findUniqueUsername(base: string) {
  const prefix = base.slice(0, 20) || "google_user";
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

  return `google_${randomBytes(6).toString("hex")}`;
}

function toMetadataJson(claims: GoogleIdTokenClaims) {
  return {
    email: claims.email ?? null,
    email_verified: claims.email_verified ?? null,
    name: claims.name ?? null,
    given_name: claims.given_name ?? null,
    family_name: claims.family_name ?? null,
    picture: claims.picture ?? null,
  };
}

function normalizeEmail(email: string | undefined) {
  return (email ?? "").trim().toLowerCase();
}

function isEmailVerified(value: boolean | undefined) {
  return value === true;
}

export async function upsertGoogleUser(claims: GoogleIdTokenClaims) {
  const providerAccountId = claims.sub;
  const email = normalizeEmail(claims.email);
  if (!email) {
    throw new Error("Google id_token is missing required email claim.");
  }

  const existingRows = await prisma.$queryRaw<Array<{ id: string; userId: string }>>`
    SELECT id, "userId"
    FROM "AuthAccount"
    WHERE provider = ${GOOGLE_PROVIDER}
      AND "providerAccountId" = ${providerAccountId}
    LIMIT 1
  `;
  const existingAccount = existingRows[0];
  const emailVerified = isEmailVerified(claims.email_verified);
  const metadata = JSON.stringify(toMetadataJson(claims));
  const providerImageUrl = getInitialProviderImageUrl(claims.picture);

  if (existingAccount) {
    const currentUser = await prisma.user.findUnique({
      where: { id: existingAccount.userId },
      select: {
        imageUrl: true,
        avatarSource: true,
      },
    });
    const updatedUser = await prisma.user.update({
      where: { id: existingAccount.userId },
      data: {
        email,
        name: claims.name?.trim() || null,
        emailVerifiedAt: emailVerified ? new Date() : undefined,
        ...getProviderAvatarUpdate({
          providerPicture: claims.picture,
          currentImageUrl: currentUser?.imageUrl ?? null,
          avatarSource: currentUser?.avatarSource ?? "PROVIDER",
        }),
      },
      select: {
        id: true,
        role: true,
        username: true,
        name: true,
      },
    });

    await prisma.$executeRaw`
      UPDATE "AuthAccount"
      SET metadata = ${metadata}::jsonb,
          "updatedAt" = NOW()
      WHERE id = ${existingAccount.id}
    `;

    return updatedUser;
  }

  const byEmail = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, username: true, name: true, emailVerifiedAt: true, imageUrl: true, avatarSource: true },
  });

  const user =
    byEmail ??
    (await prisma.user.create({
      data: {
        username: await findUniqueUsername(
          sanitizeUsername(claims.given_name) || sanitizeUsername(email.split("@")[0]) || "google_user",
        ),
        email,
        name: claims.name?.trim() || null,
        imageUrl: providerImageUrl,
        avatarSource: "PROVIDER",
        passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), 12),
        role: "USER",
        status: "ACTIVE",
        emailVerifiedAt: emailVerified ? new Date() : null,
      },
      select: {
        id: true,
        role: true,
        username: true,
        name: true,
      },
    }));

  if (byEmail) {
    const avatarUpdate = getProviderAvatarUpdate({
      providerPicture: claims.picture,
      currentImageUrl: byEmail.imageUrl,
      avatarSource: byEmail.avatarSource,
    });
    if (Object.keys(avatarUpdate).length > 0) {
      await prisma.user.update({
        where: { id: byEmail.id },
        data: avatarUpdate,
      });
    }
  }

  try {
    await prisma.$executeRaw`
      INSERT INTO "AuthAccount"
        ("id", provider, "providerAccountId", "userId", metadata, "createdAt", "updatedAt")
      VALUES
        (${randomBytes(12).toString("hex")},
         ${GOOGLE_PROVIDER},
         ${providerAccountId},
         ${user.id},
         ${metadata}::jsonb,
         NOW(),
         NOW())
    `;
  } catch (error) {
    logger.error("Google auth account link failed", {
      providerAccountId,
      userId: user.id,
      error,
    });
    throw error;
  }

  if (byEmail && emailVerified && !byEmail.emailVerifiedAt) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    });
  }

  return user;
}
