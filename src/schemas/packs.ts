import { z } from "zod";

const trimmed = z.string().trim();
const questionTimerPresetValues = [30, 40, 45, 60] as const;

export const createPackSchema = z.object({
  title: trimmed.min(3, "Title must be 3-80 characters.").max(80, "Title must be 3-80 characters."),
  description: z
    .union([trimmed.max(240, "Description must be 240 characters or fewer."), z.literal("")])
    .transform((value) => (value === "" ? null : value)),
  visibility: z.enum(["DRAFT", "PRIVATE", "PUBLIC"]).default("DRAFT"),
});

export const updatePackSettingsSchema = z.object({
  packId: trimmed.min(1, "Pack is required."),
  breakTimerSec: z.coerce
    .number()
    .int("Must be a whole number.")
    .min(10, "Write answers time must be between 10 and 300.")
    .max(300, "Write answers time must be between 10 and 300."),
  defaultQuestionTimerPresetSec: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z
      .union([
        z.null(),
        z
          .coerce
          .number()
          .int("Must be a whole number.")
          .refine((v) => questionTimerPresetValues.includes(v as (typeof questionTimerPresetValues)[number]), {
            message: "Question timer preset must be 30, 40, 45, or 60 sec.",
          }),
      ]),
  ),
  breakMusicAssetId: z
    .union([trimmed.min(1, "Break music is invalid."), z.literal(""), z.null(), z.undefined()])
    .transform((value) => (typeof value === "string" && value.length > 0 ? value : null)),
  timerMusicAssetId: z
    .union([trimmed.min(1, "Timer music is invalid."), z.literal(""), z.null(), z.undefined()])
    .transform((value) => (typeof value === "string" && value.length > 0 ? value : null)),
});

export const deletePackSchema = z.object({
  packId: trimmed.min(1, "Pack is required."),
});

export type CreatePackInput = z.input<typeof createPackSchema>;
export type UpdatePackSettingsInput = z.input<typeof updatePackSettingsSchema>;
