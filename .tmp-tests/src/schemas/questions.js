"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeQuestionMediaSchema = exports.setQuestionPrimaryMediaSchema = exports.upsertQuestionOptionsSchema = exports.moveQuestionSchema = exports.deleteQuestionSchema = exports.updateQuestionSchema = exports.createQuestionSchema = exports.questionOptionInputSchema = exports.answerTypeSchema = exports.questionTypeSchema = void 0;
const zod_1 = require("zod");
const trimmed = zod_1.z.string().trim();
exports.questionTypeSchema = zod_1.z.enum(["TEXT", "IMAGE", "VIDEO", "AUDIO", "OPTIONS"]);
exports.answerTypeSchema = zod_1.z.enum(["TEXT", "IMAGE", "AUDIO", "VIDEO"]);
const timerOverrideValues = [30, 40, 45, 60];
exports.questionOptionInputSchema = zod_1.z.object({
    order: zod_1.z.coerce.number().int().min(1).max(4),
    // Allow empty text here so non-OPTIONS question forms can keep placeholder option rows without failing validation.
    text: trimmed.max(200, "Option text must be 200 characters or fewer."),
    isCorrect: zod_1.z.boolean(),
});
const baseQuestionSchema = zod_1.z.object({
    text: trimmed.min(5, "Question text must be at least 5 characters.").max(4000, "Question text is too long."),
    answerType: exports.answerTypeSchema,
    answerText: zod_1.z
        .union([trimmed.max(500, "Answer text must be 500 characters or fewer."), zod_1.z.literal(""), zod_1.z.null(), zod_1.z.undefined()])
        .transform((v) => (typeof v === "string" ? v.trim() : ""))
        .refine((v) => v.length > 0, { message: "Answer is required" })
        .transform((v) => v),
    explanation: zod_1.z
        .union([trimmed.max(4000, "Explanation is too long."), zod_1.z.literal(""), zod_1.z.null(), zod_1.z.undefined()])
        .transform((v) => (typeof v === "string" && v.length > 0 ? v : null)),
    type: exports.questionTypeSchema,
    timerSec: zod_1.z
        .union([zod_1.z.literal(""), zod_1.z.null(), zod_1.z.undefined(), zod_1.z.coerce.number().int()])
        .transform((v) => (typeof v === "number" && Number.isFinite(v) ? v : null))
        .refine((v) => v == null || timerOverrideValues.includes(v), {
        message: "Timer must be one of 30, 40, 45, or 60 sec.",
    }),
    primaryMediaAssetId: zod_1.z
        .union([trimmed.min(1, "Primary media is invalid."), zod_1.z.literal(""), zod_1.z.null(), zod_1.z.undefined()])
        .transform((v) => (typeof v === "string" && v.length > 0 ? v : null)),
    answerPrimaryMediaAssetId: zod_1.z
        .union([trimmed.min(1, "Answer media is invalid."), zod_1.z.literal(""), zod_1.z.null(), zod_1.z.undefined()])
        .transform((v) => (typeof v === "string" && v.length > 0 ? v : null)),
    options: zod_1.z.array(exports.questionOptionInputSchema).optional().default([]),
});
function enforceQuestionTypeRules(schema) {
    return schema.superRefine((data, ctx) => {
        const value = data;
        const isMediaType = value.type === "IMAGE" || value.type === "VIDEO" || value.type === "AUDIO";
        if (isMediaType && !value.primaryMediaAssetId) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ["primaryMediaAssetId"],
                message: "Primary media is required for this question type.",
            });
        }
        if (value.type === "OPTIONS") {
            if (!value.options || value.options.length !== 4) {
                ctx.addIssue({
                    code: zod_1.z.ZodIssueCode.custom,
                    path: ["options"],
                    message: "Exactly 4 options are required.",
                });
                return;
            }
            const emptyOption = value.options.find((o) => o.text.trim().length < 1);
            if (emptyOption) {
                ctx.addIssue({
                    code: zod_1.z.ZodIssueCode.custom,
                    path: ["options"],
                    message: "All 4 option texts are required.",
                });
            }
            const correctCount = value.options.filter((o) => o.isCorrect).length;
            if (correctCount !== 1) {
                ctx.addIssue({
                    code: zod_1.z.ZodIssueCode.custom,
                    path: ["options"],
                    message: "Exactly one option must be marked correct.",
                });
            }
        }
        const isMediaAnswer = value.answerType === "IMAGE" || value.answerType === "VIDEO" || value.answerType === "AUDIO";
        if (isMediaAnswer && !value.answerPrimaryMediaAssetId) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ["answerPrimaryMediaAssetId"],
                message: "Answer media is required for this answer type.",
            });
        }
    });
}
exports.createQuestionSchema = enforceQuestionTypeRules(zod_1.z.object(Object.assign({ roundId: trimmed.min(1, "Round is required.") }, baseQuestionSchema.shape)));
exports.updateQuestionSchema = enforceQuestionTypeRules(zod_1.z.object(Object.assign({ questionId: trimmed.min(1, "Question is required.") }, baseQuestionSchema.shape)));
exports.deleteQuestionSchema = zod_1.z.object({
    questionId: trimmed.min(1, "Question is required."),
});
exports.moveQuestionSchema = zod_1.z.object({
    questionId: trimmed.min(1, "Question is required."),
    direction: zod_1.z.enum(["up", "down"]),
});
exports.upsertQuestionOptionsSchema = zod_1.z.object({
    questionId: trimmed.min(1, "Question is required."),
    options: zod_1.z.array(exports.questionOptionInputSchema).length(4, "Exactly 4 options are required."),
}).superRefine((data, ctx) => {
    if (data.options.some((o) => o.text.trim().length < 1)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["options"],
            message: "All 4 option texts are required.",
        });
    }
    if (data.options.filter((o) => o.isCorrect).length !== 1) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["options"],
            message: "Exactly one option must be marked correct.",
        });
    }
});
exports.setQuestionPrimaryMediaSchema = zod_1.z.object({
    questionId: trimmed.min(1, "Question is required."),
    assetId: trimmed.min(1, "Asset is required."),
});
exports.removeQuestionMediaSchema = zod_1.z.object({
    questionId: trimmed.min(1, "Question is required."),
    mediaId: trimmed.min(1, "Media is required."),
});
