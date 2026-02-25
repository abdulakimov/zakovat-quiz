"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPresenterReducerTests = runPresenterReducerTests;
const reducer_1 = require("./reducer");
function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}
function runTest(name, fn) {
    try {
        fn();
        // eslint-disable-next-line no-console
        console.log(`✓ ${name}`);
    }
    catch (error) {
        // eslint-disable-next-line no-console
        console.error(`✗ ${name}`);
        throw error;
    }
}
function createContext(items, questionTimers, writeDurationSec = 60) {
    return {
        items,
        writeDurationSec,
        getQuestionTimerSec: (id) => { var _a; return (_a = questionTimers[id]) !== null && _a !== void 0 ? _a : 60; },
    };
}
function initialState() {
    return {
        index: 0,
        timerStatus: "IDLE",
        timerDurationMs: 0,
        timerRemainingMs: 0,
        timerStartedAtMs: null,
    };
}
function runPresenterReducerTests() {
    runTest("T1 ASK_TIMER behavior", () => {
        const items = [
            { kind: "ASK_TIMER", roundId: "r1", questionId: "q1" },
            { kind: "ASK_READ", roundId: "r1", questionId: "q2" },
        ];
        const ctx = createContext(items, { q1: 30 });
        let state = (0, reducer_1.presenterReducer)(initialState(), { type: "SET_INDEX", index: 0 }, ctx);
        state = (0, reducer_1.presenterReducer)(state, { type: "NEXT", nowMs: 1000 }, ctx);
        assert(state.index === 0, "ASK_TIMER NEXT should not advance when IDLE");
        assert(state.timerStatus === "RUNNING", "ASK_TIMER NEXT should start timer");
        state = (0, reducer_1.presenterReducer)(state, { type: "NEXT", nowMs: 1200 }, ctx);
        assert(state.index === 1, "ASK_TIMER NEXT should advance when RUNNING");
        assert(state.timerStatus === "IDLE", "Timer should reset after advance");
        state = (0, reducer_1.presenterReducer)(state, { type: "SET_INDEX", index: 0 }, ctx);
        state = (0, reducer_1.presenterReducer)(state, { type: "NEXT", nowMs: 2000 }, ctx);
        state = (0, reducer_1.presenterReducer)(state, { type: "TIMER_TICK", nowMs: 2000 + 30000 }, ctx);
        assert(state.timerStatus === "FINISHED", "Timer should finish");
        state = (0, reducer_1.presenterReducer)(state, { type: "NEXT", nowMs: 23000 }, ctx);
        assert(state.index === 1, "ASK_TIMER NEXT should advance when FINISHED");
    });
    runTest("T2 WRITE_ANSWERS behavior", () => {
        const items = [
            { kind: "WRITE_ANSWERS", roundId: "r1", durationSec: 60 },
            { kind: "REVEAL_INTRO", roundId: "r1" },
        ];
        const ctx = createContext(items, {}, 60);
        let state = (0, reducer_1.presenterReducer)(initialState(), { type: "SET_INDEX", index: 0 }, ctx);
        state = (0, reducer_1.presenterReducer)(state, { type: "NEXT", nowMs: 1000 }, ctx);
        assert(state.index === 0, "WRITE NEXT should not advance when IDLE");
        assert(state.timerStatus === "RUNNING", "WRITE NEXT should start timer");
        state = (0, reducer_1.presenterReducer)(state, { type: "NEXT", nowMs: 1200 }, ctx);
        assert(state.index === 1, "WRITE NEXT should advance when RUNNING");
    });
    runTest("T3 Non-timer slides advance immediately", () => {
        const items = [
            { kind: "ASK_READ", roundId: "r1", questionId: "q1" },
            { kind: "ASK_MEDIA", roundId: "r1", questionId: "q1" },
        ];
        const ctx = createContext(items, { q1: 30 });
        let state = (0, reducer_1.presenterReducer)(initialState(), { type: "SET_INDEX", index: 0 }, ctx);
        state = (0, reducer_1.presenterReducer)(state, { type: "NEXT", nowMs: 0 }, ctx);
        assert(state.index === 1, "ASK_READ should advance immediately");
    });
    runTest("T4 Timer does not restart without NEXT", () => {
        const items = [{ kind: "ASK_TIMER", roundId: "r1", questionId: "q1" }];
        const ctx = createContext(items, { q1: 10 });
        let state = (0, reducer_1.presenterReducer)(initialState(), { type: "SET_INDEX", index: 0 }, ctx);
        state = (0, reducer_1.presenterReducer)(state, { type: "NEXT", nowMs: 0 }, ctx);
        assert(state.timerStatus === "RUNNING", "Timer should start");
        state = (0, reducer_1.presenterReducer)(state, { type: "TIMER_TICK", nowMs: 2000 }, ctx);
        assert(state.timerStatus === "RUNNING", "Timer should keep running");
        state = (0, reducer_1.presenterReducer)(state, { type: "TIMER_TICK", nowMs: 10000 }, ctx);
        assert(state.timerStatus === "FINISHED", "Timer should finish");
        state = (0, reducer_1.presenterReducer)(state, { type: "TIMER_TICK", nowMs: 12000 }, ctx);
        assert(state.timerStatus === "FINISHED", "Timer should stay finished");
    });
    runTest("T5 Full flow mini-deck", () => {
        const items = [
            { kind: "ASK_READ", roundId: "r1", questionId: "q1" },
            { kind: "ASK_MEDIA", roundId: "r1", questionId: "q1" },
            { kind: "ASK_TIMER", roundId: "r1", questionId: "q1" },
            { kind: "ASK_READ", roundId: "r1", questionId: "q2" },
            { kind: "ASK_TIMER", roundId: "r1", questionId: "q2" },
            { kind: "RECAP_INTRO", roundId: "r1" },
            { kind: "RECAP_QUESTION", roundId: "r1", questionId: "q1" },
            { kind: "WRITE_ANSWERS", roundId: "r1", durationSec: 60 },
            { kind: "REVEAL_INTRO", roundId: "r1" },
            { kind: "REVEAL_QUESTION", roundId: "r1", questionId: "q1" },
            { kind: "REVEAL_ANSWER", roundId: "r1", questionId: "q1" },
        ];
        const ctx = createContext(items, { q1: 30, q2: 40 }, 60);
        let state = (0, reducer_1.presenterReducer)(initialState(), { type: "SET_INDEX", index: 0 }, ctx);
        state = (0, reducer_1.presenterReducer)(state, { type: "NEXT", nowMs: 0 }, ctx);
        assert(state.index === 1, "ASK_READ -> ASK_MEDIA");
        state = (0, reducer_1.presenterReducer)(state, { type: "NEXT", nowMs: 0 }, ctx);
        assert(state.index === 2, "ASK_MEDIA -> ASK_TIMER");
        state = (0, reducer_1.presenterReducer)(state, { type: "NEXT", nowMs: 0 }, ctx);
        assert(state.index === 2 && state.timerStatus === "RUNNING", "ASK_TIMER starts timer");
        state = (0, reducer_1.presenterReducer)(state, { type: "NEXT", nowMs: 0 }, ctx);
        assert(state.index === 3, "ASK_TIMER running -> next question");
        state = (0, reducer_1.presenterReducer)(state, { type: "NEXT", nowMs: 0 }, ctx);
        assert(state.index === 4, "ASK_READ -> ASK_TIMER");
        state = (0, reducer_1.presenterReducer)(state, { type: "NEXT", nowMs: 0 }, ctx);
        assert(state.timerStatus === "RUNNING", "ASK_TIMER starts");
        state = (0, reducer_1.presenterReducer)(state, { type: "NEXT", nowMs: 0 }, ctx);
        assert(state.index === 5, "ASK_TIMER -> RECAP_INTRO");
        state = (0, reducer_1.presenterReducer)(state, { type: "NEXT", nowMs: 0 }, ctx);
        assert(state.index === 6, "RECAP_INTRO -> RECAP_QUESTION");
        state = (0, reducer_1.presenterReducer)(state, { type: "NEXT", nowMs: 0 }, ctx);
        assert(state.index === 7, "RECAP_QUESTION -> WRITE_ANSWERS");
        state = (0, reducer_1.presenterReducer)(state, { type: "NEXT", nowMs: 0 }, ctx);
        assert(state.timerStatus === "RUNNING", "WRITE_ANSWERS starts");
        state = (0, reducer_1.presenterReducer)(state, { type: "NEXT", nowMs: 0 }, ctx);
        assert(state.index === 8, "WRITE_ANSWERS -> REVEAL_INTRO");
        state = (0, reducer_1.presenterReducer)(state, { type: "NEXT", nowMs: 0 }, ctx);
        assert(state.index === 9, "REVEAL_INTRO -> REVEAL_QUESTION");
        state = (0, reducer_1.presenterReducer)(state, { type: "NEXT", nowMs: 0 }, ctx);
        assert(state.index === 10, "REVEAL_QUESTION -> REVEAL_ANSWER");
    });
}
