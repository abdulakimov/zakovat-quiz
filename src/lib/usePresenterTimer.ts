"use client";

import * as React from "react";

export type TimerStatus = "IDLE" | "RUNNING" | "PAUSED" | "FINISHED";

export type PresenterTimerState = {
  durationMs: number;
  remainingMs: number;
  status: TimerStatus;
};

export function usePresenterTimer() {
  const [state, setState] = React.useState<PresenterTimerState>({
    durationMs: 0,
    remainingMs: 0,
    status: "IDLE",
  });

  const startedAtRef = React.useRef<number | null>(null);
  const elapsedBeforeRef = React.useRef<number>(0);

  const prime = React.useCallback((durationMs: number) => {
    startedAtRef.current = null;
    elapsedBeforeRef.current = 0;
    setState({
      durationMs,
      remainingMs: durationMs,
      status: "IDLE",
    });
  }, []);

  const start = React.useCallback((durationMs: number) => {
    if (durationMs <= 0) return;
    startedAtRef.current = Date.now();
    elapsedBeforeRef.current = 0;
    setState({
      durationMs,
      remainingMs: durationMs,
      status: "RUNNING",
    });
  }, []);

  const pause = React.useCallback(() => {
    if (state.status !== "RUNNING") return;
    if (startedAtRef.current) {
      elapsedBeforeRef.current += Date.now() - startedAtRef.current;
    }
    startedAtRef.current = null;
    setState((prev) => ({ ...prev, status: "PAUSED" }));
  }, [state.status]);

  const resume = React.useCallback(() => {
    if (state.status !== "PAUSED") return;
    startedAtRef.current = Date.now();
    setState((prev) => ({ ...prev, status: "RUNNING" }));
  }, [state.status]);

  const stop = React.useCallback(() => {
    startedAtRef.current = null;
    elapsedBeforeRef.current = 0;
    setState((prev) => ({
      durationMs: prev.durationMs,
      remainingMs: prev.durationMs,
      status: "IDLE",
    }));
  }, []);

  React.useEffect(() => {
    if (state.status !== "RUNNING") return;
    const tick = () => {
      const startedAt = startedAtRef.current;
      if (!startedAt) return;
      const elapsed = elapsedBeforeRef.current + (Date.now() - startedAt);
      const remaining = Math.max(0, state.durationMs - elapsed);
      if (remaining <= 0) {
        startedAtRef.current = null;
        elapsedBeforeRef.current = state.durationMs;
        setState((prev) => ({ ...prev, remainingMs: 0, status: "FINISHED" }));
        return;
      }
      setState((prev) => ({ ...prev, remainingMs: remaining }));
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [state.durationMs, state.status]);

  return {
    timer: state,
    start,
    prime,
    stop,
    pause,
    resume,
  };
}
