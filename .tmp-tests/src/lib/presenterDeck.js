"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPresenterDeck = buildPresenterDeck;
function buildPresenterDeck(slides, options) {
    var _a, _b, _c, _d;
    const rounds = slides.filter((slide) => slide.kind === "roundIntro");
    const questions = slides.filter((slide) => slide.kind === "question");
    const roundsById = new Map();
    const questionsById = new Map();
    const questionsByRound = new Map();
    for (const round of rounds) {
        roundsById.set(round.roundId, round);
    }
    for (const question of questions) {
        questionsById.set(question.questionId, question);
        const list = (_a = questionsByRound.get(question.roundId)) !== null && _a !== void 0 ? _a : [];
        list.push(question);
        questionsByRound.set(question.roundId, list);
    }
    for (const [roundId, list] of questionsByRound.entries()) {
        list.sort((a, b) => a.questionOrder - b.questionOrder);
        questionsByRound.set(roundId, list);
    }
    const orderedRounds = [...rounds].sort((a, b) => a.roundOrder - b.roundOrder);
    const items = [];
    for (const round of orderedRounds) {
        const list = (_b = questionsByRound.get(round.roundId)) !== null && _b !== void 0 ? _b : [];
        const recapEnabled = (_d = (_c = options.recapEnabledByRound) === null || _c === void 0 ? void 0 : _c.get(round.roundId)) !== null && _d !== void 0 ? _d : true;
        items.push({ kind: "ROUND_INTRO", roundId: round.roundId });
        for (const question of list) {
            items.push({ kind: "ASK_READ", roundId: round.roundId, questionId: question.questionId });
            if ((question.questionType === "AUDIO" || question.questionType === "VIDEO") &&
                question.primaryMedia) {
                items.push({ kind: "ASK_MEDIA", roundId: round.roundId, questionId: question.questionId });
            }
            items.push({ kind: "ASK_TIMER", roundId: round.roundId, questionId: question.questionId });
        }
        if (recapEnabled && list.length >= 2) {
            items.push({ kind: "RECAP_INTRO", roundId: round.roundId });
            for (const question of list) {
                items.push({ kind: "RECAP_QUESTION", roundId: round.roundId, questionId: question.questionId });
            }
        }
        items.push({ kind: "WRITE_ANSWERS", roundId: round.roundId, durationSec: options.writeDurationSec });
        items.push({ kind: "REVEAL_INTRO", roundId: round.roundId });
        for (const question of list) {
            items.push({ kind: "REVEAL_QUESTION", roundId: round.roundId, questionId: question.questionId });
            items.push({ kind: "REVEAL_ANSWER", roundId: round.roundId, questionId: question.questionId });
        }
    }
    return { items, roundsById, questionsById, questionsByRound };
}
