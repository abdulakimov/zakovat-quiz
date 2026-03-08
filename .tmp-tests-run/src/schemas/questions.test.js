"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runQuestionSchemaTests = runQuestionSchemaTests;
const strict_1 = __importDefault(require("node:assert/strict"));
const questions_1 = require("./questions");
const validOptions = [
    { order: 1, text: "Option A", isCorrect: true },
    { order: 2, text: "Option B", isCorrect: false },
    { order: 3, text: "Option C", isCorrect: false },
    { order: 4, text: "Option D", isCorrect: false },
];
function baseOptionsInput() {
    return {
        roundId: "round_1",
        type: "OPTIONS",
        answerType: "TEXT",
        text: "Pick the right answer",
        answerText: "Option A",
        explanation: "",
        timerSec: "",
        answerPrimaryMediaAssetId: "",
        options: validOptions,
    };
}
function runQuestionSchemaTests() {
    const withMedia = questions_1.createQuestionSchema.safeParse(Object.assign(Object.assign({}, baseOptionsInput()), { primaryMediaAssetId: "asset_123" }));
    strict_1.default.equal(withMedia.success, true, "OPTIONS question should accept optional primary media.");
    const withoutMedia = questions_1.createQuestionSchema.safeParse(Object.assign(Object.assign({}, baseOptionsInput()), { primaryMediaAssetId: "" }));
    strict_1.default.equal(withoutMedia.success, true, "OPTIONS question should allow missing media.");
    const imageWithoutMedia = questions_1.createQuestionSchema.safeParse(Object.assign(Object.assign({}, baseOptionsInput()), { type: "IMAGE", options: [], primaryMediaAssetId: "" }));
    strict_1.default.equal(imageWithoutMedia.success, false, "IMAGE question should still require primary media.");
}
