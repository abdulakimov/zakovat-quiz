import assert from "node:assert/strict";
import { createQuestionSchema } from "./questions";

const validOptions = [
  { order: 1, text: "Option A", isCorrect: true },
  { order: 2, text: "Option B", isCorrect: false },
  { order: 3, text: "Option C", isCorrect: false },
  { order: 4, text: "Option D", isCorrect: false },
];

function baseOptionsInput() {
  return {
    roundId: "round_1",
    type: "OPTIONS" as const,
    answerType: "TEXT" as const,
    text: "Pick the right answer",
    answerText: "Option A",
    explanation: "",
    timerSec: "",
    answerPrimaryMediaAssetId: "",
    options: validOptions,
  };
}

export function runQuestionSchemaTests() {
  const withMedia = createQuestionSchema.safeParse({
    ...baseOptionsInput(),
    primaryMediaAssetId: "asset_123",
  });
  assert.equal(withMedia.success, true, "OPTIONS question should accept optional primary media.");

  const withoutMedia = createQuestionSchema.safeParse({
    ...baseOptionsInput(),
    primaryMediaAssetId: "",
  });
  assert.equal(withoutMedia.success, true, "OPTIONS question should allow missing media.");

  const imageWithoutMedia = createQuestionSchema.safeParse({
    ...baseOptionsInput(),
    type: "IMAGE",
    options: [],
    primaryMediaAssetId: "",
  });
  assert.equal(imageWithoutMedia.success, false, "IMAGE question should still require primary media.");
}
