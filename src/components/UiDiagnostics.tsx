"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

type UiDiagnosticsSnapshot = {
  host: string;
  dpr: number;
  htmlFontSize: string;
  bodyFontSize: string;
  bodyFontFamily: string;
  bodyLineHeight: string;
};

function takeSnapshot(): UiDiagnosticsSnapshot {
  const htmlStyles = window.getComputedStyle(document.documentElement);
  const bodyStyles = window.getComputedStyle(document.body);

  return {
    host: window.location.host,
    dpr: window.devicePixelRatio,
    htmlFontSize: htmlStyles.fontSize,
    bodyFontSize: bodyStyles.fontSize,
    bodyFontFamily: bodyStyles.fontFamily,
    bodyLineHeight: bodyStyles.lineHeight,
  };
}

export function UiDiagnostics() {
  const searchParams = useSearchParams();
  const enabledByQuery = searchParams.get("debug") === "1";
  const enabledByEnv = process.env.NEXT_PUBLIC_UI_DEBUG === "true";
  const enabled = enabledByQuery || enabledByEnv;
  const [snapshot, setSnapshot] = React.useState<UiDiagnosticsSnapshot | null>(null);

  React.useEffect(() => {
    if (!enabled) {
      setSnapshot(null);
      return;
    }

    const update = () => setSnapshot(takeSnapshot());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [enabled]);

  if (!enabled || !snapshot) {
    return null;
  }

  return (
    <div className="fixed bottom-3 right-3 z-[1000] max-w-xs rounded-md border border-border bg-popover/95 p-3 text-xs text-popover-foreground shadow-lg backdrop-blur">
      <p className="font-semibold text-foreground">UI diagnostics</p>
      <p>host: {snapshot.host}</p>
      <p>devicePixelRatio: {snapshot.dpr}</p>
      <p>html font-size: {snapshot.htmlFontSize}</p>
      <p>body font-size: {snapshot.bodyFontSize}</p>
      <p>body font-family: {snapshot.bodyFontFamily}</p>
      <p>body line-height: {snapshot.bodyLineHeight}</p>
      <p className="mt-2 text-[11px] text-muted-foreground">
        If devicePixelRatio differs, reset Chrome zoom to 100% (Ctrl+0).
      </p>
    </div>
  );
}
