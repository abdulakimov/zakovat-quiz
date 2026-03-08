"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.presenterReducer = presenterReducer;
function isTimerItem(item) {
    return Boolean(item && (item.kind === "ASK_TIMER" || item.kind === "WRITE_ANSWERS"));
}
function clampIndex(index, max) {
    if (max <= 0)
        return 0;
    return Math.max(0, Math.min(index, max - 1));
}
function getDurationMs(item, ctx) {
    if (!item)
        return 0;
    if (item.kind === "ASK_TIMER") {
        const sec = ctx.getQuestionTimerSec(item.questionId);
        return Math.max(0, sec) * 1000;
    }
    if (item.kind === "WRITE_ANSWERS") {
        return Math.max(0, ctx.writeDurationSec) * 1000;
    }
    return 0;
}
function resetForIndex(state, nextIndex, ctx) {
    const clamped = clampIndex(nextIndex, ctx.items.length);
    const nextItem = ctx.items[clamped];
    const durationMs = getDurationMs(nextItem, ctx);
    return {
        index: clamped,
        timerStatus: "IDLE",
        timerDurationMs: durationMs,
        timerRemainingMs: durationMs,
        timerStartedAtMs: null,
    };
}
function presenterReducer(state, event, ctx) {
    const currentItem = ctx.items[state.index];
    switch (event.type) {
        case "SET_INDEX":
            return resetForIndex(state, event.index, ctx);
        case "PREV":
            return resetForIndex(state, state.index - 1, ctx);
        case "NEXT": {
            if (isTimerItem(currentItem)) {
                if (state.timerStatus === "IDLE") {
                    const durationMs = getDurationMs(currentItem, ctx);
                    if (durationMs <= 0)
                        return state;
                    return Object.assign(Object.assign({}, state), { timerStatus: "RUNNING", timerDurationMs: durationMs, timerRemainingMs: durationMs, timerStartedAtMs: event.nowMs });
                }
                if (state.timerStatus === "RUNNING" || state.timerStatus === "PAUSED") {
                    return resetForIndex(state, state.index + 1, ctx);
                }
                if (state.timerStatus === "FINISHED") {
                    return resetForIndex(state, state.index + 1, ctx);
                }
            }
            return resetForIndex(state, state.index + 1, ctx);
        }
        case "TIMER_TICK": {
            if (state.timerStatus !== "RUNNING" || state.timerStartedAtMs === null)
                return state;
            const elapsed = event.nowMs - state.timerStartedAtMs;
            const remaining = Math.max(0, state.timerDurationMs - elapsed);
            if (remaining <= 0) {
                return Object.assign(Object.assign({}, state), { timerStatus: "FINISHED", timerRemainingMs: 0, timerStartedAtMs: null });
            }
            return Object.assign(Object.assign({}, state), { timerRemainingMs: remaining });
        }
        case "RESET_TIMER":
            return resetForIndex(state, state.index, ctx);
        default:
            return state;
    }
}
