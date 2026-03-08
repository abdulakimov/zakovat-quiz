"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { safeAction, type ActionResult } from "@/src/lib/actions";
import { updateProfileSchema } from "@/src/schemas/profile";

type UpdateProfileResult = {
  success: string;
  name: string | null;
  username: string;
  displayName: string | null;
  imageUrl: string | null;
  avatarSource: "PROVIDER" | "CUSTOM";
  avatarAssetId: string | null;
  avatarUrl: string | null;
};

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
        avatarSource: parsed.avatarAssetId ? "CUSTOM" : "PROVIDER",
      },
      select: {
        name: true,
        username: true,
        displayName: true,
        imageUrl: true,
        avatarSource: true,
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
      imageUrl: updated.imageUrl,
      avatarSource: updated.avatarSource,
      avatarAssetId: updated.avatarAssetId,
      avatarUrl: updated.avatarAsset?.path ? `/api/media/${updated.avatarAsset.path}` : updated.imageUrl,
    };
  });

  return execute(input);
}

export async function changePasswordAction(
  _input: unknown,
): Promise<ActionResult<{ success: string; sessionRotated: boolean }>> {
  await requireUser();
  return {
    ok: false,
    error: "Password authentication is disabled for this app.",
    fieldErrors: {},
  };
}
