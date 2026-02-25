import { z } from "zod";

const trimmed = z.string().trim();

export const questionTypeSchema = z.enum(["TEXT", "IMAGE", "VIDEO", "AUDIO", "OPTIONS"]);
export const answerTypeSchema = z.enum(["TEXT", "IMAGE", "AUDIO", "VIDEO"]);
const timerOverrideValues = [30, 40, 45, 60] as const;

export const questionOptionInputSchema = z.object({
  order: z.coerce.number().int().min(1).max(4),
  // Allow empty text here so non-OPTIONS question forms can keep placeholder option rows without failing validation.
  text: trimmed.max(200, "Option text must be 200 characters or fewer."),
  isCorrect: z.boolean(),
});

const baseQuestionSchema = z.object({
  text: trimmed.min(5, "Question text must be at least 5 characters.").max(4000, "Question text is too long."),
  answerType: answerTypeSchema,
  answerText: z
    .union([trimmed.max(500, "Answer text must be 500 characters or fewer."), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (typeof v === "string" ? v.trim() : ""))
    .refine((v) => v.length > 0, { message: "Answer is required" })
    .transform((v) => v),
  explanation: z
    .union([trimmed.max(4000, "Explanation is too long."), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (typeof v === "string" && v.length > 0 ? v : null)),
  type: questionTypeSchema,
  timerSec: z
    .union([z.literal(""), z.null(), z.undefined(), z.coerce.number().int()])
    .transform((v) => (typeof v === "number" && Number.isFinite(v) ? v : null))
    .refine((v) => v == null || timerOverrideValues.includes(v as (typeof timerOverrideValues)[number]), {
      message: "Timer must be one of 30, 40, 45, or 60 sec.",
    }),
  primaryMediaAssetId: z
    .union([trimmed.min(1, "Primary media is invalid."), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (typeof v === "string" && v.length > 0 ? v : null)),
  answerPrimaryMediaAssetId: z
    .union([trimmed.min(1, "Answer media is invalid."), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (typeof v === "string" && v.length > 0 ? v : null)),
  options: z.array(questionOptionInputSchema).optional().default([]),
});

function enforceQuestionTypeRules<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.superRefine((data, ctx) => {
    const isMediaType = data.type === "IMAGE" || data.type === "VIDEO" || data.type === "AUDIO";
    if (isMediaType && !data.primaryMediaAssetId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["primaryMediaAssetId"],
        message: "Primary media is required for this question type.",
      });
    }

    if (data.type === "OPTIONS") {
      if (!data.options || data.options.length !== 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: "Exactly 4 options are required.",
        });
        return;
      }
      const emptyOption = data.options.find((o) => o.text.trim().length < 1);
      if (emptyOption) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: "All 4 option texts are required.",
        });
      }
      const correctCount = data.options.filter((o) => o.isCorrect).length;
      if (correctCount !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: "Exactly one option must be marked correct.",
        });
      }
    }

    const isMediaAnswer =
      data.answerType === "IMAGE" || data.answerType === "VIDEO" || data.answerType === "AUDIO";
    if (isMediaAnswer && !data.answerPrimaryMediaAssetId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["answerPrimaryMediaAssetId"],
        message: "Answer media is required for this answer type.",
      });
    }
  });
}

export const createQuestionSchema = enforceQuestionTypeRules(
  z.object({
    roundId: trimmed.min(1, "Round is required."),
    ...baseQuestionSchema.shape,
  }),
);

export const updateQuestionSchema = enforceQuestionTypeRules(
  z.object({
    questionId: trimmed.min(1, "Question is required."),
    ...baseQuestionSchema.shape,
  }),
);

export const deleteQuestionSchema = z.object({
  questionId: trimmed.min(1, "Question is required."),
});

export const moveQuestionSchema = z.object({
  questionId: trimmed.min(1, "Question is required."),
  direction: z.enum(["up", "down"]),
});

export const upsertQuestionOptionsSchema = z.object({
  questionId: trimmed.min(1, "Question is required."),
  options: z.array(questionOptionInputSchema).length(4, "Exactly 4 options are required."),
}).superRefine((data, ctx) => {
  if (data.options.some((o) => o.text.trim().length < 1)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["options"],
      message: "All 4 option texts are required.",
    });
  }
  if (data.options.filter((o) => o.isCorrect).length !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["options"],
      message: "Exactly one option must be marked correct.",
    });
  }
});

export const setQuestionPrimaryMediaSchema = z.object({
  questionId: trimmed.min(1, "Question is required."),
  assetId: trimmed.min(1, "Asset is required."),
});

export const removeQuestionMediaSchema = z.object({
  questionId: trimmed.min(1, "Question is required."),
  mediaId: trimmed.min(1, "Media is required."),
});
