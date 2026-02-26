"use server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type PresenterSlide =
  | {
      id: string;
      kind: "roundIntro";
      roundId: string;
      roundTitle: string;
      roundOrder: number;
      questionCount: number;
      defaultTimerSec: number;
      defaultQuestionType: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "OPTIONS";
    }
  | {
      id: string;
      kind: "question";
      roundId: string;
      roundTitle: string;
      roundOrder: number;
      questionId: string;
      questionOrder: number;
      questionType: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "OPTIONS";
      answerType?: "TEXT" | "IMAGE" | "AUDIO" | "VIDEO";
      text: string;
      answer: string;
      answerText?: string | null;
      explanation: string | null;
      timerSec: number;
      usesOverrideTimer: boolean;
      options: Array<{ order: number; text: string; isCorrect: boolean }>;
      primaryMedia: { id: string; url: string; name: string; type: "IMAGE" | "VIDEO" | "AUDIO" } | null;
      answerPrimaryMedia?: { id: string; url: string; name: string; type: "IMAGE" | "VIDEO" | "AUDIO" } | null;
    }
  | {
      id: string;
      kind: "break";
      roundId: string;
      roundTitle: string;
      roundOrder: number;
      breakTimerSec: number;
      breakMusicUrl: string | null;
    };

export async function getPresenterPackData(packId: string) {
  const user = await requireUser();
  const pack = await prisma.pack.findUnique({
    where: { id: packId },
    select: {
      id: true,
      title: true,
      ownerId: true,
      breakTimerSec: true,
      defaultQuestionTimerPresetSec: true,
      breakMusicAsset: { select: { id: true, path: true, originalName: true } },
      timerMusicAsset: { select: { id: true, path: true, originalName: true } },
      rounds: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          title: true,
          defaultTimerSec: true,
          defaultQuestionType: true,
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
              options: {
                orderBy: { order: "asc" },
                select: { order: true, text: true, isCorrect: true },
              },
              media: {
                orderBy: { createdAt: "asc" },
                select: {
                  id: true,
                  role: true,
                  asset: { select: { id: true, path: true, originalName: true, type: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!pack || pack.ownerId !== user.id) {
    return { pack: null, slides: [] as PresenterSlide[], totalQuestions: 0 };
  }

  const slides: PresenterSlide[] = [];
  let totalQuestions = 0;

  for (let i = 0; i < pack.rounds.length; i += 1) {
    const round = pack.rounds[i];
    totalQuestions += round.questions.length;

    slides.push({
      id: `round:${round.id}`,
      kind: "roundIntro",
      roundId: round.id,
      roundTitle: round.title,
      roundOrder: round.order,
      questionCount: round.questions.length,
      defaultTimerSec: round.defaultTimerSec,
      defaultQuestionType: round.defaultQuestionType,
    });

    for (const q of round.questions) {
      const primary = q.media.find((m) => m.role === "QUESTION_PRIMARY");
      const answerPrimary = q.media.find((m) => m.role === "ANSWER_PRIMARY");
      slides.push({
        id: `question:${q.id}`,
        kind: "question",
        roundId: round.id,
        roundTitle: round.title,
        roundOrder: round.order,
        questionId: q.id,
        questionOrder: q.order,
        questionType: q.type,
        answerType: q.answerType,
        text: q.text,
        answer: q.answer,
        answerText: q.answerText,
        explanation: q.explanation,
        timerSec: pack.defaultQuestionTimerPresetSec ?? round.defaultTimerSec,
        usesOverrideTimer: false,
        options: q.options,
        primaryMedia: primary
          ? {
              id: primary.asset.id,
              url: `/api/media/${primary.asset.path}`,
              name: primary.asset.originalName,
              type: primary.asset.type,
            }
          : null,
        answerPrimaryMedia: answerPrimary
          ? {
              id: answerPrimary.asset.id,
              url: `/api/media/${answerPrimary.asset.path}`,
              name: answerPrimary.asset.originalName,
              type: answerPrimary.asset.type,
            }
          : null,
      });
    }

    if (i < pack.rounds.length - 1) {
      slides.push({
        id: `break:${round.id}`,
        kind: "break",
        roundId: round.id,
        roundTitle: round.title,
        roundOrder: round.order,
        breakTimerSec: pack.breakTimerSec,
        breakMusicUrl: pack.breakMusicAsset ? `/api/media/${pack.breakMusicAsset.path}` : null,
      });
    }
  }

  return {
    pack: {
      id: pack.id,
      title: pack.title,
      breakTimerSec: pack.breakTimerSec,
      defaultQuestionTimerPresetSec: pack.defaultQuestionTimerPresetSec,
      breakMusicUrl: pack.breakMusicAsset ? `/api/media/${pack.breakMusicAsset.path}` : null,
      timerMusicUrl: pack.timerMusicAsset ? `/api/media/${pack.timerMusicAsset.path}` : null,
      rounds: pack.rounds.map((r) => ({
        id: r.id,
        title: r.title,
        order: r.order,
        defaultTimerSec: r.defaultTimerSec,
        defaultQuestionType: r.defaultQuestionType,
        questionsCount: r.questions.length,
      })),
    },
    slides,
    totalQuestions,
  };
}
