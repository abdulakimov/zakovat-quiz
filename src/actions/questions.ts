"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { safeAction, type ActionResult } from "@/src/lib/actions";
import {
  createQuestionSchema,
  deleteQuestionSchema,
  moveQuestionSchema,
  removeQuestionMediaSchema,
  setQuestionPrimaryMediaSchema,
  updateQuestionSchema,
  upsertQuestionOptionsSchema,
} from "@/src/schemas/questions";

export type QuestionActionState = {
  error?: string;
  success?: string;
  questionId?: string;
};

function mapActionError(error: string, fieldErrors?: Record<string, string[] | undefined>) {
  const firstFieldError = Object.values(fieldErrors ?? {}).flat().find(Boolean);
  return firstFieldError ?? error;
}

function actionStateFromResult<TState>(result: ActionResult<TState>): TState {
  if (!result.ok) return { error: mapActionError(result.error, result.fieldErrors) } as TState;
  return result.data;
}

function parseOptionsJson(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || raw.trim() === "") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}


async function assertRoundOwner(tx: Prisma.TransactionClient, userId: string, roundId: string) {
  const round = await tx.round.findUnique({
    where: { id: roundId },
    select: { id: true, packId: true, pack: { select: { ownerId: true } } },
  });
  if (!round) return { error: "Round not found." } as const;
  if (round.pack.ownerId !== userId) return { error: "Only the pack owner can manage questions." } as const;
  return { round } as const;
}

async function assertQuestionOwner(tx: Prisma.TransactionClient, userId: string, questionId: string) {
  const question = await tx.question.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      order: true,
      roundId: true,
      type: true,
      answerType: true,
      round: { select: { id: true, packId: true, defaultTimerSec: true, pack: { select: { ownerId: true } } } },
    },
  });
  if (!question) return { error: "Question not found." } as const;
  if (question.round.pack.ownerId !== userId) return { error: "Only the pack owner can manage questions." } as const;
  return { question } as const;
}

async function assertMediaOwnershipForType(
  tx: Prisma.TransactionClient,
  userId: string,
  assetId: string | null,
  mediaType: "IMAGE" | "VIDEO" | "AUDIO" | "TEXT" | "OPTIONS",
) {
  if (!assetId) return { ok: true } as const;
  const asset = await tx.mediaAsset.findUnique({
    where: { id: assetId },
    select: { id: true, ownerId: true, type: true },
  });
  if (!asset || asset.ownerId !== userId) return { ok: false, error: "Selected media asset is invalid." } as const;
  const expected =
    mediaType === "IMAGE" ? "IMAGE" : mediaType === "VIDEO" ? "VIDEO" : mediaType === "AUDIO" ? "AUDIO" : null;
  if (expected && asset.type !== expected) {
    return { ok: false, error: `Selected media must be ${expected.toLowerCase()}.` } as const;
  }
  return { ok: true } as const;
}

async function normalizeQuestionOrders(tx: Prisma.TransactionClient, roundId: string) {
  const questions = await tx.question.findMany({
    where: { roundId },
    select: { id: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  for (let i = 0; i < questions.length; i += 1) {
    await tx.question.update({ where: { id: questions[i].id }, data: { order: i + 1 } });
  }
}

async function replaceOptions(tx: Prisma.TransactionClient, questionId: string, options: { order: number; text: string; isCorrect: boolean }[]) {
  await tx.questionOption.deleteMany({ where: { questionId } });
  if (options.length === 0) return;
  await tx.questionOption.createMany({
    data: options.map((o) => ({
      questionId,
      order: o.order,
      text: o.text.trim(),
      isCorrect: o.isCorrect,
    })),
  });
}


async function setPrimaryMedia(
  tx: Prisma.TransactionClient,
  questionId: string,
  assetId: string,
  role: "QUESTION_PRIMARY" | "ANSWER_PRIMARY",
) {
  await tx.questionMedia.deleteMany({
    where: { questionId, role },
  });
  await tx.questionMedia.create({
    data: { questionId, assetId, role },
  });
}

async function clearPrimaryMedia(tx: Prisma.TransactionClient, questionId: string, role: "QUESTION_PRIMARY" | "ANSWER_PRIMARY") {
  await tx.questionMedia.deleteMany({ where: { questionId, role } });
}

async function applyQuestionTypeSideEffects(
  tx: Prisma.TransactionClient,
  userId: string,
  questionId: string,
  input: {
    type: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "OPTIONS";
    primaryMediaAssetId: string | null;
    options: { order: number; text: string; isCorrect: boolean }[];
  },
) {
  if (input.type === "OPTIONS") {
    await clearPrimaryMedia(tx, questionId, "QUESTION_PRIMARY");
    await replaceOptions(tx, questionId, input.options);
    return;
  }

  if (input.type === "TEXT") {
    await replaceOptions(tx, questionId, []);
    await clearPrimaryMedia(tx, questionId, "QUESTION_PRIMARY");
    return;
  }

  const mediaCheck = await assertMediaOwnershipForType(tx, userId, input.primaryMediaAssetId, input.type);
  if (!mediaCheck.ok) throw new Error(mediaCheck.error);
  if (!input.primaryMediaAssetId) throw new Error("Primary media is required for this question type.");

  await replaceOptions(tx, questionId, []);
  await setPrimaryMedia(tx, questionId, input.primaryMediaAssetId, "QUESTION_PRIMARY");
}

async function applyAnswerTypeSideEffects(
  tx: Prisma.TransactionClient,
  userId: string,
  questionId: string,
  input: {
    answerType: "TEXT" | "IMAGE" | "AUDIO" | "VIDEO";
    answerPrimaryMediaAssetId: string | null;
  },
) {
  if (input.answerType === "TEXT") {
    await clearPrimaryMedia(tx, questionId, "ANSWER_PRIMARY");
    return;
  }

  const mediaCheck = await assertMediaOwnershipForType(tx, userId, input.answerPrimaryMediaAssetId, input.answerType);
  if (!mediaCheck.ok) throw new Error(mediaCheck.error);
  if (!input.answerPrimaryMediaAssetId) throw new Error("Answer media is required for this answer type.");
  await setPrimaryMedia(tx, questionId, input.answerPrimaryMediaAssetId, "ANSWER_PRIMARY");
}

function getLegacyAnswerValue(input: { answerType: "TEXT" | "IMAGE" | "AUDIO" | "VIDEO"; answerText: string | null }) {
  if (input.answerText && input.answerText.trim().length > 0) return input.answerText.trim();
  if (input.answerType === "TEXT") return "";
  return "(media answer)";
}


export async function createQuestionAction(_prev: QuestionActionState, formData: FormData): Promise<QuestionActionState> {
  const user = await requireUser();
  const execute = safeAction(createQuestionSchema, async (input) => {
    const result = await prisma.$transaction(async (tx) => {
      const ownerCheck = await assertRoundOwner(tx, user.id, input.roundId);
      if ("error" in ownerCheck) return { error: ownerCheck.error } satisfies QuestionActionState;

      const last = await tx.question.findFirst({
        where: { roundId: input.roundId },
        select: { order: true },
        orderBy: { order: "desc" },
      });

      const question = await tx.question.create({
        data: {
          roundId: input.roundId,
          order: (last?.order ?? 0) + 1,
          type: input.type,
          answerType: input.answerType,
          text: input.text.trim(),
          answer: getLegacyAnswerValue({ answerType: input.answerType, answerText: input.answerText }),
          answerText: input.answerText,
          explanation: input.explanation,
          timerSec: input.timerSec,
        },
        select: { id: true, roundId: true },
      });

      await applyQuestionTypeSideEffects(tx, user.id, question.id, {
        type: input.type,
        primaryMediaAssetId: input.primaryMediaAssetId,
        options: input.options ?? [],
      });
      await applyAnswerTypeSideEffects(tx, user.id, question.id, {
        answerType: input.answerType,
        answerPrimaryMediaAssetId: input.answerPrimaryMediaAssetId,
      });
      return { success: "Question created.", questionId: question.id } satisfies QuestionActionState;
    });
    return result;
  });

  const result = await execute({
    roundId: String(formData.get("roundId") ?? ""),
    type: String(formData.get("type") ?? ""),
    text: String(formData.get("text") ?? ""),
    answerType: String(formData.get("answerType") ?? "TEXT"),
    answerText: formData.get("answerText"),
    explanation: formData.get("explanation"),
    timerSec: formData.get("timerSec"),
    primaryMediaAssetId: formData.get("primaryMediaAssetId"),
    answerPrimaryMediaAssetId: formData.get("answerPrimaryMediaAssetId"),
    options: parseOptionsJson(formData.get("options")),
  });
  const state = actionStateFromResult(result);
  const roundId = String(formData.get("roundId") ?? "");
  const packId = String(formData.get("packId") ?? "");
  if (!state.error) {
    if (packId) revalidatePath(`/app/packs/${packId}`);
    if (packId && roundId) revalidatePath(`/app/packs/${packId}/rounds/${roundId}`);
  }
  return state;
}

export async function updateQuestionAction(_prev: QuestionActionState, formData: FormData): Promise<QuestionActionState> {
  const user = await requireUser();
  const execute = safeAction(updateQuestionSchema, async (input) => {
    const result = await prisma.$transaction(async (tx) => {
      const ownerCheck = await assertQuestionOwner(tx, user.id, input.questionId);
      if ("error" in ownerCheck) return { error: ownerCheck.error } satisfies QuestionActionState;

      const question = ownerCheck.question;
      await tx.question.update({
        where: { id: question.id },
        data: {
          type: input.type,
          answerType: input.answerType,
          text: input.text.trim(),
          answer: getLegacyAnswerValue({ answerType: input.answerType, answerText: input.answerText }),
          answerText: input.answerText,
          explanation: input.explanation,
          timerSec: input.timerSec,
        },
      });

      await applyQuestionTypeSideEffects(tx, user.id, question.id, {
        type: input.type,
        primaryMediaAssetId: input.primaryMediaAssetId,
        options: input.options ?? [],
      });
      await applyAnswerTypeSideEffects(tx, user.id, question.id, {
        answerType: input.answerType,
        answerPrimaryMediaAssetId: input.answerPrimaryMediaAssetId,
      });
      return { success: "Question updated.", questionId: question.id } satisfies QuestionActionState;
    });
    return result;
  });

  const result = await execute({
    questionId: String(formData.get("questionId") ?? ""),
    type: String(formData.get("type") ?? ""),
    text: String(formData.get("text") ?? ""),
    answerType: String(formData.get("answerType") ?? "TEXT"),
    answerText: formData.get("answerText"),
    explanation: formData.get("explanation"),
    timerSec: formData.get("timerSec"),
    primaryMediaAssetId: formData.get("primaryMediaAssetId"),
    answerPrimaryMediaAssetId: formData.get("answerPrimaryMediaAssetId"),
    options: parseOptionsJson(formData.get("options")),
  });
  const state = actionStateFromResult(result);
  const roundId = String(formData.get("roundId") ?? "");
  const packId = String(formData.get("packId") ?? "");
  if (!state.error) {
    if (packId) revalidatePath(`/app/packs/${packId}`);
    if (packId && roundId) revalidatePath(`/app/packs/${packId}/rounds/${roundId}`);
  }
  return state;
}

export async function deleteQuestionAction(formData: FormData): Promise<QuestionActionState> {
  const user = await requireUser();
  const execute = safeAction(deleteQuestionSchema, async (input) => {
    const result = await prisma.$transaction(async (tx) => {
      const ownerCheck = await assertQuestionOwner(tx, user.id, input.questionId);
      if ("error" in ownerCheck) return { error: ownerCheck.error } satisfies QuestionActionState;
      await tx.question.delete({ where: { id: input.questionId } });
      await normalizeQuestionOrders(tx, ownerCheck.question.roundId);
      return { success: "Question deleted." } satisfies QuestionActionState;
    });
    return result;
  });

  const state = actionStateFromResult(await execute({ questionId: String(formData.get("questionId") ?? "") }));
  const roundId = String(formData.get("roundId") ?? "");
  const packId = String(formData.get("packId") ?? "");
  if (!state.error) {
    if (packId) revalidatePath(`/app/packs/${packId}`);
    if (packId && roundId) revalidatePath(`/app/packs/${packId}/rounds/${roundId}`);
  }
  return state;
}

export async function moveQuestionAction(_prev: QuestionActionState, formData: FormData): Promise<QuestionActionState> {
  const user = await requireUser();
  const execute = safeAction(moveQuestionSchema, async (input) => {
    const result = await prisma.$transaction(async (tx) => {
      const ownerCheck = await assertQuestionOwner(tx, user.id, input.questionId);
      if ("error" in ownerCheck) return { error: ownerCheck.error } satisfies QuestionActionState;

      const q = ownerCheck.question;
      const targetOrder = input.direction === "up" ? q.order - 1 : q.order + 1;
      if (targetOrder < 1) return { error: "Question is already at the top." } satisfies QuestionActionState;

      const adjacent = await tx.question.findUnique({
        where: { roundId_order: { roundId: q.roundId, order: targetOrder } },
        select: { id: true, order: true },
      });
      if (!adjacent) {
        return {
          error: input.direction === "down" ? "Question is already at the bottom." : "Question is already at the top.",
        } satisfies QuestionActionState;
      }

      await tx.question.update({ where: { id: q.id }, data: { order: 0 } });
      await tx.question.update({ where: { id: adjacent.id }, data: { order: q.order } });
      await tx.question.update({ where: { id: q.id }, data: { order: targetOrder } });
      await normalizeQuestionOrders(tx, q.roundId);
      return { success: "Question moved." } satisfies QuestionActionState;
    });
    return result;
  });

  const state = actionStateFromResult(
    await execute({
      questionId: String(formData.get("questionId") ?? ""),
      direction: String(formData.get("direction") ?? ""),
    }),
  );
  const roundId = String(formData.get("roundId") ?? "");
  const packId = String(formData.get("packId") ?? "");
  if (!state.error) {
    if (packId) revalidatePath(`/app/packs/${packId}`);
    if (packId && roundId) revalidatePath(`/app/packs/${packId}/rounds/${roundId}`);
  }
  return state;
}

export async function reorderQuestionsAction(_prev: QuestionActionState, formData: FormData): Promise<QuestionActionState> {
  const user = await requireUser();
  const execute = safeAction(
    z.object({
      roundId: z.string().min(1),
      orderedQuestionIds: z.array(z.string().min(1)).min(1),
    }),
    async (input) => {
      const result = await prisma.$transaction(async (tx) => {
        const ownerCheck = await assertRoundOwner(tx, user.id, input.roundId);
        if ("error" in ownerCheck) return { error: ownerCheck.error } satisfies QuestionActionState;

        const existing = await tx.question.findMany({
          where: { roundId: input.roundId },
          select: { id: true },
          orderBy: { order: "asc" },
        });
        if (existing.length !== input.orderedQuestionIds.length) {
          return { error: "Question list is out of date." } satisfies QuestionActionState;
        }
        const validIds = new Set(existing.map((q) => q.id));
        if (input.orderedQuestionIds.some((id) => !validIds.has(id))) {
          return { error: "Invalid question ids." } satisfies QuestionActionState;
        }

        // Avoid (roundId, order) unique collisions by writing temporary values first.
        for (let i = 0; i < input.orderedQuestionIds.length; i += 1) {
          await tx.question.update({
            where: { id: input.orderedQuestionIds[i] },
            data: { order: -(i + 1) },
          });
        }
        for (let i = 0; i < input.orderedQuestionIds.length; i += 1) {
          await tx.question.update({
            where: { id: input.orderedQuestionIds[i] },
            data: { order: i + 1 },
          });
        }
        await normalizeQuestionOrders(tx, input.roundId);
        return { success: "Question order updated." } satisfies QuestionActionState;
      });
      return result;
    },
  );

  let orderedQuestionIds: string[] = [];
  try {
    const raw = String(formData.get("orderedQuestionIds") ?? "[]");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) orderedQuestionIds = parsed.map((v) => String(v));
  } catch {}

  const state = actionStateFromResult(
    await execute({
      roundId: String(formData.get("roundId") ?? ""),
      orderedQuestionIds,
    }),
  );
  const packId = String(formData.get("packId") ?? "");
  const roundId = String(formData.get("roundId") ?? "");
  if (!state.error && packId && roundId) revalidatePath(`/app/packs/${packId}/rounds/${roundId}`);
  return state;
}

export async function upsertQuestionOptionsAction(_prev: QuestionActionState, formData: FormData): Promise<QuestionActionState> {
  const user = await requireUser();
  const execute = safeAction(upsertQuestionOptionsSchema, async (input) => {
    const result = await prisma.$transaction(async (tx) => {
      const ownerCheck = await assertQuestionOwner(tx, user.id, input.questionId);
      if ("error" in ownerCheck) return { error: ownerCheck.error } satisfies QuestionActionState;
      if (ownerCheck.question.type !== "OPTIONS") {
        return { error: "Question type must be OPTIONS to save options." } satisfies QuestionActionState;
      }
      await replaceOptions(tx, input.questionId, input.options);
      return { success: "Options updated.", questionId: input.questionId } satisfies QuestionActionState;
    });
    return result;
  });
  const state = actionStateFromResult(
    await execute({
      questionId: String(formData.get("questionId") ?? ""),
      options: parseOptionsJson(formData.get("options")),
    }),
  );
  const packId = String(formData.get("packId") ?? "");
  const roundId = String(formData.get("roundId") ?? "");
  if (!state.error && packId && roundId) revalidatePath(`/app/packs/${packId}/rounds/${roundId}`);
  return state;
}

export async function setQuestionPrimaryMediaAction(_prev: QuestionActionState, formData: FormData): Promise<QuestionActionState> {
  const user = await requireUser();
  const execute = safeAction(setQuestionPrimaryMediaSchema, async (input) => {
    const result = await prisma.$transaction(async (tx) => {
      const ownerCheck = await assertQuestionOwner(tx, user.id, input.questionId);
      if ("error" in ownerCheck) return { error: ownerCheck.error } satisfies QuestionActionState;
      const questionType = ownerCheck.question.type;
      if (questionType !== "IMAGE" && questionType !== "VIDEO" && questionType !== "AUDIO") {
        return { error: "Question type does not accept primary media." } satisfies QuestionActionState;
      }
      const mediaCheck = await assertMediaOwnershipForType(tx, user.id, input.assetId, questionType);
      if (!mediaCheck.ok) return { error: mediaCheck.error } satisfies QuestionActionState;
      await setPrimaryMedia(tx, input.questionId, input.assetId, "QUESTION_PRIMARY");
      return { success: "Primary media updated.", questionId: input.questionId } satisfies QuestionActionState;
    });
    return result;
  });
  const state = actionStateFromResult(await execute({
    questionId: String(formData.get("questionId") ?? ""),
    assetId: String(formData.get("assetId") ?? ""),
  }));
  const packId = String(formData.get("packId") ?? "");
  const roundId = String(formData.get("roundId") ?? "");
  if (!state.error && packId && roundId) revalidatePath(`/app/packs/${packId}/rounds/${roundId}`);
  return state;
}

export async function removeQuestionMediaAction(_prev: QuestionActionState, formData: FormData): Promise<QuestionActionState> {
  const user = await requireUser();
  const execute = safeAction(removeQuestionMediaSchema, async (input) => {
    const result = await prisma.$transaction(async (tx) => {
      const ownerCheck = await assertQuestionOwner(tx, user.id, input.questionId);
      if ("error" in ownerCheck) return { error: ownerCheck.error } satisfies QuestionActionState;
      await tx.questionMedia.delete({
        where: { id: input.mediaId },
      });
      return { success: "Question media removed.", questionId: input.questionId } satisfies QuestionActionState;
    });
    return result;
  });
  const state = actionStateFromResult(
    await execute({
      questionId: String(formData.get("questionId") ?? ""),
      mediaId: String(formData.get("mediaId") ?? ""),
    }),
  );
  const packId = String(formData.get("packId") ?? "");
  const roundId = String(formData.get("roundId") ?? "");
  if (!state.error && packId && roundId) revalidatePath(`/app/packs/${packId}/rounds/${roundId}`);
  return state;
}

export async function getRoundQuestionBuilderData(packId: string, roundId: string) {
  const user = await requireUser();
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: {
      id: true,
      order: true,
      title: true,
      description: true,
      packId: true,
      defaultTimerSec: true,
      defaultQuestionType: true,
      pack: {
        select: {
          id: true,
          title: true,
          defaultQuestionTimerPresetSec: true,
          ownerId: true,
        },
      },
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          type: true,
          answerType: true,
          text: true,
          answer: true,
          answerText: true,
          explanation: true,
          timerSec: true,
          createdAt: true,
          options: {
            orderBy: { order: "asc" },
            select: { id: true, order: true, text: true, isCorrect: true },
          },
          media: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              role: true,
              assetId: true,
              asset: { select: { id: true, type: true, path: true, originalName: true } },
            },
          },
        },
      },
    },
  });

  if (!round || round.packId !== packId || round.pack.ownerId !== user.id) {
    return { round: null, pack: null, mediaAssets: [] };
  }

  const mediaAssets = await prisma.mediaAsset.findMany({
    where: { ownerId: user.id },
    select: { id: true, type: true, path: true, originalName: true, createdAt: true, sizeBytes: true, mimeType: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return { round, pack: round.pack, mediaAssets };
}

export async function getQuestionEditorBaseData(packId: string, roundId: string) {
  const user = await requireUser();
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: {
      id: true,
      order: true,
      title: true,
      description: true,
      packId: true,
      defaultTimerSec: true,
      defaultQuestionType: true,
      pack: {
        select: {
          id: true,
          title: true,
          defaultQuestionTimerPresetSec: true,
          ownerId: true,
        },
      },
    },
  });

  if (!round || round.packId !== packId || round.pack.ownerId !== user.id) {
    return { round: null, pack: null, mediaAssets: [] };
  }

  const mediaAssets = await prisma.mediaAsset.findMany({
    where: { ownerId: user.id },
    select: { id: true, type: true, path: true, originalName: true, createdAt: true, sizeBytes: true, mimeType: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return { round, pack: round.pack, mediaAssets };
}

export async function getQuestionEditorData(packId: string, roundId: string, questionId: string) {
  const user = await requireUser();
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      order: true,
      type: true,
      answerType: true,
      text: true,
      answer: true,
      answerText: true,
      explanation: true,
      timerSec: true,
      round: {
        select: {
          id: true,
          order: true,
          title: true,
          description: true,
          packId: true,
          defaultTimerSec: true,
          defaultQuestionType: true,
          pack: {
            select: {
              id: true,
              title: true,
              defaultQuestionTimerPresetSec: true,
              ownerId: true,
            },
          },
        },
      },
      options: {
        orderBy: { order: "asc" },
        select: { id: true, order: true, text: true, isCorrect: true },
      },
      media: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          assetId: true,
          asset: { select: { id: true, type: true, path: true, originalName: true, sizeBytes: true, mimeType: true } },
        },
      },
    },
  });

  if (
    !question ||
    question.round.packId !== packId ||
    question.round.id !== roundId ||
    question.round.pack.ownerId !== user.id
  ) {
    return { question: null, round: null, pack: null, mediaAssets: [] };
  }

  const mediaAssets = await prisma.mediaAsset.findMany({
    where: { ownerId: user.id },
    select: { id: true, type: true, path: true, originalName: true, createdAt: true, sizeBytes: true, mimeType: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return { question, round: question.round, pack: question.round.pack, mediaAssets };
}
