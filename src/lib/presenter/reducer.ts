"use client";

export type PresenterItem =
  | { kind: "ROUND_INTRO"; roundId: string }
  | { kind: "ASK_READ"; roundId: string; questionId: string }
  | { kind: "ASK_MEDIA"; roundId: string; questionId: string }
  | { kind: "ASK_TIMER"; roundId: string; questionId: string }
  | { kind: "RECAP_INTRO"; roundId: string }
  | { kind: "RECAP_QUESTION"; roundId: string; questionId: string }
  | { kind: "WRITE_ANSWERS"; roundId: string; durationSec: number }
  | { kind: "REVEAL_INTRO"; roundId: string }
  | { kind: "REVEAL_QUESTION"; roundId: string; questionId: string }
  | { kind: "REVEAL_ANSWER"; roundId: string; questionId: string };

export type TimerStatus = "IDLE" | "RUNNING" | "PAUSED" | "FINISHED";

export type PresenterState = {
  index: number;
  timerStatus: TimerStatus;
  timerDurationMs: number;
  timerRemainingMs: number;
  timerStartedAtMs: number | null;
};

export type PresenterEvent =
  | { type: "NEXT"; nowMs: number }
  | { type: "PREV" }
  | { type: "SET_INDEX"; index: number }
  | { type: "TIMER_TICK"; nowMs: number }
  | { type: "RESET_TIMER" };

export type PresenterContext = {
  items: PresenterItem[];
  getQuestionTimerSec: (questionId: string) => number;
  writeDurationSec: number;
};

function isTimerItem(item: PresenterItem | undefined): item is PresenterItem & ({ kind: "ASK_TIMER" } | { kind: "WRITE_ANSWERS" }) {
  return Boolean(item && (item.kind === "ASK_TIMER" || item.kind === "WRITE_ANSWERS"));
}

function clampIndex(index: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(index, max - 1));
}

function getDurationMs(item: PresenterItem | undefined, ctx: PresenterContext) {
  if (!item) return 0;
  if (item.kind === "ASK_TIMER") {
    const sec = ctx.getQuestionTimerSec(item.questionId);
    return Math.max(0, sec) * 1000;
  }
  if (item.kind === "WRITE_ANSWERS") {
    return Math.max(0, ctx.writeDurationSec) * 1000;
  }
  return 0;
}

function resetForIndex(state: PresenterState, nextIndex: number, ctx: PresenterContext): PresenterState {
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

export function presenterReducer(state: PresenterState, event: PresenterEvent, ctx: PresenterContext): PresenterState {
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
          if (durationMs <= 0) return state;
          return {
            ...state,
            timerStatus: "RUNNING",
            timerDurationMs: durationMs,
            timerRemainingMs: durationMs,
            timerStartedAtMs: event.nowMs,
          };
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
      if (state.timerStatus !== "RUNNING" || state.timerStartedAtMs === null) return state;
      const elapsed = event.nowMs - state.timerStartedAtMs;
      const remaining = Math.max(0, state.timerDurationMs - elapsed);
      if (remaining <= 0) {
        return {
          ...state,
          timerStatus: "FINISHED",
          timerRemainingMs: 0,
          timerStartedAtMs: null,
        };
      }
      return {
        ...state,
        timerRemainingMs: remaining,
      };
    }
    case "RESET_TIMER":
      return resetForIndex(state, state.index, ctx);
    default:
      return state;
  }
}
