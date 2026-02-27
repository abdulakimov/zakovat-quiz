"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Maximize2, RotateCcw, Volume2 } from "lucide-react";
import { useTranslations } from "@/src/i18n/client";
import { MinimalHint } from "@/src/components/presenter/MinimalHint";

export function PresenterShell({
  packTitle,
  roundTitle,
  phaseLabel,
  progressLabel,
  volume,
  onVolumeChange,
  onPrev,
  onNext,
  canPrev,
  canNext,
  hint,
  children,
  onToggleFullscreen,
  backHref,
  onRestart,
  audioWarning,
}: {
  packTitle: string;
  roundTitle: string;
  phaseLabel: string;
  progressLabel: string;
  volume: number;
  onVolumeChange: (value: number) => void;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  hint: string | null;
  children: React.ReactNode;
  onToggleFullscreen: () => void;
  backHref: string;
  onRestart: () => void;
  audioWarning?: string | null;
}) {
  const tCommon = useTranslations("common");
  const tPresenter = useTranslations("presenter");

  return (
    <div className="fixed inset-0 z-50 flex h-full flex-col bg-white text-slate-900">
      <header className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Link href={backHref} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-100">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">{tCommon("back")}</span>
          </Link>
          <span className="max-w-[220px] truncate text-slate-900" data-testid="presenter-heading">{roundTitle}</span>
        </div>
        <div className="hidden text-xs text-slate-500 sm:block">{packTitle}</div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="hidden sm:inline">{phaseLabel} | {progressLabel}</span>
          <div className="hidden items-center gap-2 sm:flex">
            <Volume2 className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              className="h-1 w-24 accent-slate-900"
            />
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onRestart}>
            <RotateCcw className="h-4 w-4" />
            <span className="sr-only">{tPresenter("restart")}</span>
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleFullscreen}>
            <Maximize2 className="h-4 w-4" />
            <span className="sr-only">{tPresenter("fullscreen")}</span>
          </Button>
        </div>
      </header>

      {audioWarning ? (
        <div className="border-b border-slate-200 px-4 py-1 text-xs text-red-600">
          {audioWarning}
        </div>
      ) : null}

      <main className="relative flex min-h-0 flex-1 flex-col px-6 py-6">
        {children}
        <MinimalHint text={hint} />
      </main>

      <footer className="flex h-12 items-center justify-center gap-2 border-t border-slate-200">
        <Button type="button" variant="ghost" size="icon" onClick={onPrev} disabled={!canPrev} className="h-9 w-9">
          <ChevronLeft className="h-5 w-5" />
          <span className="sr-only">{tPresenter("previous")}</span>
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={onNext} disabled={!canNext} className="h-9 w-9">
          <ChevronRight className="h-5 w-5" />
          <span className="sr-only">{tPresenter("next")}</span>
        </Button>
      </footer>
    </div>
  );
}
