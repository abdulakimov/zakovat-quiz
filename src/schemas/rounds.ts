import { z } from "zod";

const trimmed = z.string().trim();

export const questionTypeSchema = z.enum(["TEXT", "IMAGE", "VIDEO", "AUDIO", "OPTIONS"]);

export const createRoundSchema = z.object({
  packId: trimmed.min(1, "Pack is required."),
  title: trimmed.min(2, "Round title is required.").max(80, "Round title must be 80 characters or fewer."),
  description: z
    .union([trimmed.max(240, "Description must be 240 characters or fewer."), z.literal("")])
    .transform((value) => (value === "" ? null : value)),
  defaultQuestionType: questionTypeSchema,
  defaultTimerSec: z.coerce.number().int().min(10, "Timer must be 10-300 sec.").max(300, "Timer must be 10-300 sec."),
});

export const updateRoundSchema = z.object({
  roundId: trimmed.min(1, "Round is required."),
  title: trimmed.min(2, "Round title is required.").max(80, "Round title must be 80 characters or fewer."),
  description: z
    .union([trimmed.max(240, "Description must be 240 characters or fewer."), z.literal("")])
    .transform((value) => (value === "" ? null : value)),
  defaultQuestionType: questionTypeSchema,
  defaultTimerSec: z.coerce.number().int().min(10, "Timer must be 10-300 sec.").max(300, "Timer must be 10-300 sec."),
});

export const deleteRoundSchema = z.object({
  roundId: trimmed.min(1, "Round is required."),
});

export const moveRoundSchema = z.object({
  roundId: trimmed.min(1, "Round is required."),
  direction: z.enum(["up", "down"]),
});

export const reorderRoundsSchema = z.object({
  packId: trimmed.min(1, "Pack is required."),
  orderedRoundIds: z.array(trimmed.min(1, "Round is required.")).min(1, "Rounds are required."),
});
