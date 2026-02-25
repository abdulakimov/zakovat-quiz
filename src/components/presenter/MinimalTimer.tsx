"use client";

import * as React from "react";

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function MinimalTimer({
  remainingMs,
  durationMs,
}: {
  remainingMs: number;
  durationMs: number;
}) {
  const progress = durationMs > 0 ? Math.max(0, Math.min(1, remainingMs / durationMs)) : 0;
  return (
    <div className="space-y-2 text-right">
      <p className="text-4xl font-semibold tabular-nums text-slate-900 sm:text-5xl">
        {formatCountdown(remainingMs || durationMs)}
      </p>
      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-200 sm:w-40">
        <div className="h-full bg-slate-900" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}

