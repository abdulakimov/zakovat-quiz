"use client";

import * as React from "react";
import { PlayIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type MediaInfo = {
  kind: "IMAGE" | "VIDEO" | "AUDIO";
  url: string;
  name: string;
};

export function MinimalMedia({
  media,
  setClipRef,
  hint,
  className,
}: {
  media: MediaInfo;
  setClipRef?: (el: HTMLMediaElement | null) => void;
  hint?: string | null;
  className?: string;
}) {
  if (media.kind === "IMAGE") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={media.url} alt={media.name} className={cn("max-h-[28rem] w-full object-contain", className)} />;
  }

  if (media.kind === "VIDEO") {
    return (
      <div className={cn("w-full", className)}>
        <video
          ref={setClipRef}
          data-clip-media
          src={media.url}
          controls
          className="w-full rounded-md border border-slate-200 bg-white"
        />
        {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2">
        <PlayIcon className="h-4 w-4 text-slate-500" aria-hidden />
        <audio ref={setClipRef} data-clip-media src={media.url} controls className="w-full" />
      </div>
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

