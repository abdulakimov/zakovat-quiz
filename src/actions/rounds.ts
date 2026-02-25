"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { safeAction } from "@/src/lib/actions";
import { createRoundSchema, deleteRoundSchema, moveRoundSchema, reorderRoundsSchema, updateRoundSchema } from "@/src/schemas/rounds";
import { z } from "zod";

export type RoundActionState = {
  error?: string;
  success?: string;
  roundId?: string;
};

const generateZakovatTemplateSchema = z.object({
  packId: z.string().trim().min(1, "Pack is required."),
});

const ZAKOVAT_TEMPLATE_ROUNDS = [
  { title: "Rasminka", defaultTimerSec: 60, defaultQuestionType: "IMAGE" },
  { title: "DTM", defaultTimerSec: 60, defaultQuestionType: "OPTIONS" },
  { title: "Soundtrack", defaultTimerSec: 60, defaultQuestionType: "AUDIO" },
  { title: "Kinomania", defaultTimerSec: 60, defaultQuestionType: "VIDEO" },
  { title: "Zanjir", defaultTimerSec: 60, defaultQuestionType: "TEXT" },
  { title: "Penalty", defaultTimerSec: 60, defaultQuestionType: "TEXT" },
  { title: "Vabank", defaultTimerSec: 75, defaultQuestionType: "TEXT" },
] as const;

function mapActionError(error: string, fieldErrors?: Record<string, string[] | undefined>) {
  const firstFieldError = Object.values(fieldErrors ?? {}).flat().find(Boolean);
  return firstFieldError ?? error;
}

function actionStateFromResult(result: Awaited<ReturnType<ReturnType<typeof safeAction>>>) {
  if (!result.ok) {
    return { error: mapActionError(result.error, result.fieldErrors) } satisfies RoundActionState;
  }
  return result.data;
}

async function assertPackOwner(tx: Prisma.TransactionClient, userId: string, packId: string) {
  const pack = await tx.pack.findUnique({
    where: { id: packId },
    select: { id: true, ownerId: true },
  });
  if (!pack) return { error: "Pack not found." } as const;
  if (pack.ownerId !== userId) return { error: "Only the pack owner can manage rounds." } as const;
  return { pack } as const;
}

async function normalizeRoundOrders(tx: Prisma.TransactionClient, packId: string) {
  const rounds = await tx.round.findMany({
    where: { packId },
    select: { id: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  for (let i = 0; i < rounds.length; i += 1) {
    const nextOrder = i + 1;
    await tx.round.update({
      where: { id: rounds[i].id },
      data: { order: nextOrder },
    });
  }
}

export async function createRoundAction(_prev: RoundActionState, formData: FormData): Promise<RoundActionState> {
  const user = await requireUser();
  const execute = safeAction(createRoundSchema, async (input) => {
    const result = await prisma.$transaction(async (tx) => {
      const ownerCheck = await assertPackOwner(tx, user.id, input.packId);
      if ("error" in ownerCheck) return { error: ownerCheck.error } satisfies RoundActionState;

      const last = await tx.round.findFirst({
        where: { packId: input.packId },
        select: { order: true },
        orderBy: { order: "desc" },
      });

      const round = await tx.round.create({
        data: {
          packId: input.packId,
          order: (last?.order ?? 0) + 1,
          title: input.title.trim(),
          description: input.description,
          defaultQuestionType: input.defaultQuestionType,
          defaultTimerSec: input.defaultTimerSec,
        },
        select: { id: true },
      });

      return { success: "Round created.", roundId: round.id } satisfies RoundActionState;
    });

    return result;
  });

  const result = await execute({
    packId: String(formData.get("packId") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    defaultQuestionType: String(formData.get("defaultQuestionType") ?? ""),
    defaultTimerSec: formData.get("defaultTimerSec"),
  });
  const state = actionStateFromResult(result);
  const packId = String(formData.get("packId") ?? "");
  if (!state.error && packId) {
    revalidatePath(`/app/packs/${packId}`);
    revalidatePath("/app/packs");
  }
  return state;
}

export async function updateRoundAction(_prev: RoundActionState, formData: FormData): Promise<RoundActionState> {
  const user = await requireUser();
  const execute = safeAction(updateRoundSchema, async (input) => {
    const result = await prisma.$transaction(async (tx) => {
      const round = await tx.round.findUnique({
        where: { id: input.roundId },
        select: { id: true, packId: true },
      });
      if (!round) return { error: "Round not found." } satisfies RoundActionState;

      const ownerCheck = await assertPackOwner(tx, user.id, round.packId);
      if ("error" in ownerCheck) return { error: ownerCheck.error } satisfies RoundActionState;

      await tx.round.update({
        where: { id: round.id },
        data: {
          title: input.title.trim(),
          description: input.description,
          defaultQuestionType: input.defaultQuestionType,
          defaultTimerSec: input.defaultTimerSec,
        },
      });

      return { success: "Round updated.", roundId: round.id } satisfies RoundActionState;
    });

    return result;
  });

  const result = await execute({
    roundId: String(formData.get("roundId") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    defaultQuestionType: String(formData.get("defaultQuestionType") ?? ""),
    defaultTimerSec: formData.get("defaultTimerSec"),
  });
  const state = actionStateFromResult(result);
  if (!state.error) {
    const packId = String(formData.get("packId") ?? "");
    if (packId) revalidatePath(`/app/packs/${packId}`);
    revalidatePath("/app/packs");
  }
  return state;
}

export async function deleteRoundAction(formData: FormData): Promise<RoundActionState> {
  const user = await requireUser();
  const execute = safeAction(deleteRoundSchema, async (input) => {
    const result = await prisma.$transaction(async (tx) => {
      const round = await tx.round.findUnique({
        where: { id: input.roundId },
        select: { id: true, packId: true, title: true },
      });
      if (!round) return { error: "Round not found." } satisfies RoundActionState;

      const ownerCheck = await assertPackOwner(tx, user.id, round.packId);
      if ("error" in ownerCheck) return { error: ownerCheck.error } satisfies RoundActionState;

      await tx.round.delete({ where: { id: round.id } });
      await normalizeRoundOrders(tx, round.packId);

      return { success: `Deleted round "${round.title}".` } satisfies RoundActionState;
    });
    return result;
  });

  const result = await execute({ roundId: String(formData.get("roundId") ?? "") });
  const state = actionStateFromResult(result);
  const packId = String(formData.get("packId") ?? "");
  if (!state.error && packId) {
    revalidatePath(`/app/packs/${packId}`);
    revalidatePath("/app/packs");
  }
  return state;
}

export async function moveRoundAction(_prev: RoundActionState, formData: FormData): Promise<RoundActionState> {
  const user = await requireUser();
  const execute = safeAction(moveRoundSchema, async (input) => {
    const result = await prisma.$transaction(async (tx) => {
      const round = await tx.round.findUnique({
        where: { id: input.roundId },
        select: { id: true, packId: true, order: true, title: true },
      });
      if (!round) return { error: "Round not found." } satisfies RoundActionState;

      const ownerCheck = await assertPackOwner(tx, user.id, round.packId);
      if ("error" in ownerCheck) return { error: ownerCheck.error } satisfies RoundActionState;

      const targetOrder = input.direction === "up" ? round.order - 1 : round.order + 1;
      if (targetOrder < 1) {
        return { error: "Round is already at the top." } satisfies RoundActionState;
      }

      const adjacent = await tx.round.findUnique({
        where: { packId_order: { packId: round.packId, order: targetOrder } },
        select: { id: true, order: true },
      });
      if (!adjacent) {
        return {
          error: input.direction === "down" ? "Round is already at the bottom." : "Round is already at the top.",
        } satisfies RoundActionState;
      }

      await tx.round.update({ where: { id: round.id }, data: { order: 0 } });
      await tx.round.update({ where: { id: adjacent.id }, data: { order: round.order } });
      await tx.round.update({ where: { id: round.id }, data: { order: targetOrder } });
      await normalizeRoundOrders(tx, round.packId);

      return { success: "Round moved." } satisfies RoundActionState;
    });
    return result;
  });

  const result = await execute({
    roundId: String(formData.get("roundId") ?? ""),
    direction: String(formData.get("direction") ?? ""),
  });
  const state = actionStateFromResult(result);
  const packId = String(formData.get("packId") ?? "");
  if (!state.error && packId) {
    revalidatePath(`/app/packs/${packId}`);
    revalidatePath("/app/packs");
  }
  return state;
}

export async function reorderRoundsAction(_prev: RoundActionState, formData: FormData): Promise<RoundActionState> {
  const user = await requireUser();
  const execute = safeAction(reorderRoundsSchema, async (input) => {
    const result = await prisma.$transaction(async (tx) => {
      const ownerCheck = await assertPackOwner(tx, user.id, input.packId);
      if ("error" in ownerCheck) return { error: ownerCheck.error } satisfies RoundActionState;

      const existing = await tx.round.findMany({
        where: { packId: input.packId },
        select: { id: true },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      });

      const existingIds = new Set(existing.map((round) => round.id));
      if (existingIds.size !== input.orderedRoundIds.length) {
        return { error: "Round order mismatch." } satisfies RoundActionState;
      }
      for (const id of input.orderedRoundIds) {
        if (!existingIds.has(id)) {
          return { error: "Round order mismatch." } satisfies RoundActionState;
        }
      }

      for (let i = 0; i < input.orderedRoundIds.length; i += 1) {
        const roundId = input.orderedRoundIds[i];
        await tx.round.update({
          where: { id: roundId },
          data: { order: -(i + 1) },
        });
      }

      for (let i = 0; i < input.orderedRoundIds.length; i += 1) {
        const roundId = input.orderedRoundIds[i];
        await tx.round.update({
          where: { id: roundId },
          data: { order: i + 1 },
        });
      }

      return { success: "Round order updated." } satisfies RoundActionState;
    });
    return result;
  });

  let orderedRoundIds: string[] = [];
  try {
    orderedRoundIds = JSON.parse(String(formData.get("orderedRoundIds") ?? "[]"));
  } catch {
    orderedRoundIds = [];
  }

  const result = await execute({
    packId: String(formData.get("packId") ?? ""),
    orderedRoundIds,
  });
  const state = actionStateFromResult(result);
  const packId = String(formData.get("packId") ?? "");
  if (!state.error && packId) {
    revalidatePath(`/app/packs/${packId}`);
    revalidatePath("/app/packs");
  }
  return state;
}

export async function generateZakovatTemplateAction(
  _prev: RoundActionState,
  formData: FormData,
): Promise<RoundActionState> {
  const user = await requireUser();
  const execute = safeAction(generateZakovatTemplateSchema, async (input) => {
    const result = await prisma.$transaction(async (tx) => {
      const ownerCheck = await assertPackOwner(tx, user.id, input.packId);
      if ("error" in ownerCheck) return { error: ownerCheck.error } satisfies RoundActionState;

      await tx.round.deleteMany({ where: { packId: input.packId } });

      for (let i = 0; i < ZAKOVAT_TEMPLATE_ROUNDS.length; i += 1) {
        const item = ZAKOVAT_TEMPLATE_ROUNDS[i];
        await tx.round.create({
          data: {
            packId: input.packId,
            order: i + 1,
            title: item.title,
            defaultQuestionType: item.defaultQuestionType,
            defaultTimerSec: item.defaultTimerSec,
          },
        });
      }

      return {
        success: `Zakovat template generated (${ZAKOVAT_TEMPLATE_ROUNDS.length} rounds).`,
      } satisfies RoundActionState;
    });
    return result;
  });

  const result = await execute({ packId: String(formData.get("packId") ?? "") });
  const state = actionStateFromResult(result);
  const packId = String(formData.get("packId") ?? "");
  if (!state.error && packId) {
    revalidatePath(`/app/packs/${packId}`);
    revalidatePath("/app/packs");
  }
  return state;
}

export async function renameFutquizRoundsToPenaltyAction(
  _prev: RoundActionState,
  _formData: FormData,
): Promise<RoundActionState> {
  const user = await requireUser();
  const execute = safeAction(z.object({}), async () => {
    const result = await prisma.round.updateMany({
      where: {
        pack: { ownerId: user.id },
        OR: [
          { title: { contains: "futquiz", mode: "insensitive" } },
          { title: { contains: "fut", mode: "insensitive" } },
        ],
      },
      data: { title: "Penalty" },
    });
    return { success: `Renamed ${result.count} rounds to Penalty.` } satisfies RoundActionState;
  });

  const result = await execute({});
  const state = actionStateFromResult(result);
  if (!state.error) {
    revalidatePath("/app/packs");
  }
  return state;
}
