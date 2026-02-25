"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { safeAction } from "@/src/lib/actions";
import { createPackSchema, deletePackSchema, updatePackSettingsSchema } from "@/src/schemas/packs";

export type PackActionState = {
  error?: string;
  success?: string;
  packId?: string;
};

function mapActionError(error: string, fieldErrors?: Record<string, string[] | undefined>) {
  const firstFieldError = Object.values(fieldErrors ?? {}).flat().find(Boolean);
  return firstFieldError ?? error;
}

function actionStateFromResult(result: Awaited<ReturnType<ReturnType<typeof safeAction>>>) {
  if (!result.ok) {
    return { error: mapActionError(result.error, result.fieldErrors) } satisfies PackActionState;
  }
  return result.data;
}

export async function createPackAction(_prev: PackActionState, formData: FormData): Promise<PackActionState> {
  const user = await requireUser();
  const execute = safeAction(createPackSchema, async (input) => {
    const pack = await prisma.pack.create({
      data: {
        ownerId: user.id,
        title: input.title.trim(),
        description: input.description,
        visibility: input.visibility,
      },
      select: { id: true },
    });

    revalidatePath("/app/packs");
    return { success: "Pack created.", packId: pack.id } satisfies PackActionState;
  });

  return actionStateFromResult(
    await execute({
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      visibility: String(formData.get("visibility") ?? "DRAFT"),
    }),
  );
}

export async function updatePackSettingsAction(_prev: PackActionState, formData: FormData): Promise<PackActionState> {
  const user = await requireUser();
  const execute = safeAction(updatePackSettingsSchema, async (input) => {
    const pack = await prisma.pack.findUnique({
      where: { id: input.packId },
      select: { id: true, ownerId: true },
    });
    if (!pack) {
      return { error: "Pack not found." } satisfies PackActionState;
    }
    if (pack.ownerId !== user.id) {
      return { error: "Only the pack owner can update pack settings." } satisfies PackActionState;
    }

    if (input.breakMusicAssetId) {
      const asset = await prisma.mediaAsset.findUnique({
        where: { id: input.breakMusicAssetId },
        select: { id: true, ownerId: true, type: true },
      });
      if (!asset || asset.ownerId !== user.id || asset.type !== "AUDIO") {
        return { error: "Selected break music is invalid." } satisfies PackActionState;
      }
    }
    if (input.timerMusicAssetId) {
      const asset = await prisma.mediaAsset.findUnique({
        where: { id: input.timerMusicAssetId },
        select: { id: true, ownerId: true, type: true },
      });
      if (!asset || asset.ownerId !== user.id || asset.type !== "AUDIO") {
        return { error: "Selected timer music is invalid." } satisfies PackActionState;
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.pack.update({
        where: { id: pack.id },
        data: {
          defaultQuestionTimerPresetSec: input.defaultQuestionTimerPresetSec,
          breakTimerSec: input.breakTimerSec,
          breakMusicAssetId: input.breakMusicAssetId,
          timerMusicAssetId: input.timerMusicAssetId,
        },
      });
    });

    revalidatePath(`/app/packs/${pack.id}`);
    revalidatePath("/app/packs");
    return { success: "Pack settings updated." } satisfies PackActionState;
  });

  return actionStateFromResult(
    await execute({
      packId: String(formData.get("packId") ?? ""),
      defaultQuestionTimerPresetSec: formData.get("defaultQuestionTimerPresetSec"),
      breakTimerSec: formData.get("breakTimerSec"),
      breakMusicAssetId: formData.get("breakMusicAssetId"),
      timerMusicAssetId: formData.get("timerMusicAssetId"),
    }),
  );
}

export async function deletePackAction(formData: FormData): Promise<PackActionState> {
  const user = await requireUser();
  const execute = safeAction(deletePackSchema, async (input) => {
    const pack = await prisma.pack.findUnique({
      where: { id: input.packId },
      select: { id: true, ownerId: true, title: true },
    });
    if (!pack || pack.ownerId !== user.id) {
      return { error: "Only the pack owner can delete this pack." } satisfies PackActionState;
    }

    await prisma.pack.delete({ where: { id: pack.id } });
    revalidatePath("/app/packs");
    return { success: `Deleted ${pack.title}.` } satisfies PackActionState;
  });

  return actionStateFromResult(await execute({ packId: String(formData.get("packId") ?? "") }));
}

export async function getMyPacks() {
  const user = await requireUser();
  const packs = await prisma.pack.findMany({
    where: { ownerId: user.id },
    select: {
      id: true,
      title: true,
      description: true,
      visibility: true,
      updatedAt: true,
      _count: { select: { rounds: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return { user, packs };
}

export async function getPackDetails(packId: string) {
  const user = await requireUser();
  const pack = await prisma.pack.findUnique({
    where: { id: packId },
    select: {
      id: true,
      ownerId: true,
      title: true,
      description: true,
      visibility: true,
      defaultQuestionTimerPresetSec: true,
      breakTimerSec: true,
      breakMusicAssetId: true,
      breakMusicAsset: { select: { id: true, originalName: true, path: true } },
      timerMusicAsset: { select: { id: true, originalName: true, path: true } },
      timerMusicAssetId: true,
      updatedAt: true,
      _count: { select: { rounds: true } },
      rounds: {
        select: {
          id: true,
          order: true,
          title: true,
          description: true,
          defaultQuestionType: true,
          defaultTimerSec: true,
          _count: { select: { questions: true } },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!pack) {
    return { user, pack: null as const, isOwner: false, audioAssets: [] as const };
  }

  const isOwner = pack.ownerId === user.id;
  if (!isOwner) {
    return { user, pack: null as const, isOwner: false, audioAssets: [] as const };
  }

  const audioAssets = await prisma.mediaAsset.findMany({
    where: { ownerId: user.id, type: "AUDIO" },
    select: { id: true, originalName: true, path: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return { user, pack, isOwner, audioAssets };
}
