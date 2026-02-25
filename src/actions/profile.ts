"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { consumeRateLimit } from "@/src/lib/rate-limit";
import { safeAction, type ActionResult } from "@/src/lib/actions";
import { changePasswordServerSchema, updateProfileSchema } from "@/src/schemas/profile";
import { getSessionCookieName, getSessionMaxAge, signSession } from "@/lib/session";

type UpdateProfileResult = {
  success: string;
  name: string | null;
  username: string;
  displayName: string | null;
  avatarAssetId: string | null;
  avatarUrl: string | null;
};

type ChangePasswordResult = {
  success: string;
  sessionRotated: boolean;
};

const PASSWORD_CHANGE_LIMIT = {
  bucket: "profile:change-password",
  limit: 5,
  windowMs: 15 * 60 * 1000,
};

async function getClientIp() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  const realIp = h.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

export async function updateProfileAction(
  input: unknown,
): Promise<ActionResult<UpdateProfileResult>> {
  const user = await requireUser();

  const execute = safeAction(updateProfileSchema, async (parsed) => {
    const normalizedUsername = parsed.username.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { username: normalizedUsername },
      select: { id: true },
    });
    if (existingUser && existingUser.id !== user.id) {
      throw new Error("Username is already taken.");
    }

    if (parsed.avatarAssetId) {
      const avatar = await prisma.mediaAsset.findUnique({
        where: { id: parsed.avatarAssetId },
        select: { id: true, ownerId: true, type: true, path: true },
      });

      if (!avatar || avatar.ownerId !== user.id || avatar.type !== "IMAGE") {
        throw new Error("Selected avatar is invalid.");
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: parsed.name,
        username: normalizedUsername,
        displayName: parsed.displayName,
        avatarAssetId: parsed.avatarAssetId,
      },
      select: {
        name: true,
        username: true,
        displayName: true,
        avatarAssetId: true,
        avatarAsset: {
          select: { path: true },
        },
      },
    });

    revalidatePath("/app/profile");
    revalidatePath("/app", "layout");

    return {
      success: "Profile updated.",
      name: updated.name,
      username: updated.username,
      displayName: updated.displayName,
      avatarAssetId: updated.avatarAssetId,
      avatarUrl: updated.avatarAsset?.path ? `/api/media/${updated.avatarAsset.path}` : null,
    };
  });

  return execute(input);
}

export async function changePasswordAction(
  input: unknown,
): Promise<ActionResult<ChangePasswordResult>> {
  const user = await requireUser();
  const clientIp = await getClientIp();

  const execute = safeAction(changePasswordServerSchema, async (parsed) => {
    const rate = consumeRateLimit({
      ...PASSWORD_CHANGE_LIMIT,
      key: `${clientIp}:${user.id}`,
    });
    if (!rate.ok) {
      throw new Error("Too many password change attempts. Please try again later.");
    }

    const stored = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, username: true, name: true, role: true, passwordHash: true },
    });
    if (!stored) {
      throw new Error("User not found.");
    }

    const matches = await bcrypt.compare(parsed.currentPassword, stored.passwordHash);
    if (!matches) {
      throw new Error("Current password is incorrect.");
    }

    const newHash = await bcrypt.hash(parsed.newPassword, 12);
    await prisma.user.update({
      where: { id: stored.id },
      data: { passwordHash: newHash },
    });

    const token = await signSession({
      sub: stored.id,
      role: stored.role,
      username: stored.username,
      name: stored.name ?? null,
    });

    const cookieStore = await cookies();
    cookieStore.set(getSessionCookieName(), token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: getSessionMaxAge(),
    });

    revalidatePath("/app/profile");
    revalidatePath("/app", "layout");

    logger.info("Password changed", { userId: user.id, clientIp });
    return { success: "Password updated.", sessionRotated: true };
  });

  const result = await execute(input);
  if (!result.ok) {
    return result;
  }

  return result;
}
