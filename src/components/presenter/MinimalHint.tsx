"use client";

import * as React from "react";

export function MinimalHint({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div className="pointer-events-none absolute bottom-3 right-4 text-xs text-muted-foreground">
      {text}
    </div>
  );
}
