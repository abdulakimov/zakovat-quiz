"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaUploadButton } from "@/src/components/media/MediaUploadButton";
import { PauseIcon, PlayIcon } from "@/src/ui/icons";

export type MusicAsset = {
  id: string;
  name: string;
  url: string;
  sizeBytes?: number | null;
  createdAt?: string;
  mimeType?: string | null;
};

type ApiAudioItem = {
  id: string;
  originalName: string;
  url: string;
  path: string;
  size?: number;
  sizeBytes?: number | null;
  createdAt?: string;
  mimeType?: string | null;
};

function formatBytes(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MusicPickerSheet({
  title,
  value,
  onChange,
  disabled,
}: {
  title: string;
  value: MusicAsset | null;
  onChange: (asset: MusicAsset | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<MusicAsset[]>([]);
  const [playing, setPlaying] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ type: "AUDIO" });
        if (query.trim()) params.set("query", query.trim());
        const res = await fetch(`/api/media-assets?${params.toString()}`, { signal: controller.signal });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.error ?? "Failed to load audio library.");
        const next = Array.isArray(payload.items)
          ? (payload.items as ApiAudioItem[]).slice(0, 20).map((item) => ({
              id: item.id,
              name: item.originalName,
              url: item.url,
              sizeBytes: item.sizeBytes ?? item.size ?? null,
              createdAt: item.createdAt,
              mimeType: item.mimeType ?? null,
            }))
          : [];
        if (active) setItems(next);
      } catch (e) {
        if (!active || (e instanceof DOMException && e.name === "AbortError")) return;
        setError(e instanceof Error ? e.message : "Failed to load audio library.");
      } finally {
        if (active) setLoading(false);
      }
    }, 200);

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [open, query]);

  React.useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    const onEnded = () => setPlaying(false);
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, []);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setPlaying(false);
  }, [value?.id]);

  const togglePreview = () => {
    if (!value || !audioRef.current) return;
    const audio = audioRef.current;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    audio.src = value.url;
    audio.currentTime = 0;
    void audio.play();
    setPlaying(true);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">Choose an audio track from your library.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => setOpen(true)}>
            Choose...
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || !value}
            onClick={() => onChange(null)}
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {value ? (
          <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
            <span className="truncate">{value.name}</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">No music selected.</span>
        )}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={!value}
          onClick={togglePreview}
        >
          {playing ? <PauseIcon className="h-3.5 w-3.5" /> : <PlayIcon className="h-3.5 w-3.5" />}
        </Button>
        <audio ref={audioRef} className="hidden" />
      </div>

      {open ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto border-l border-border bg-background p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Choose music</p>
                <p className="text-xs text-muted-foreground">Select an audio track for {title.toLowerCase()}.</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <MediaUploadButton
                mediaType="AUDIO"
                onUploaded={(asset) => {
                  const mapped: MusicAsset = {
                    id: asset.id,
                    name: asset.originalName,
                    url: asset.url ?? `/api/media/${asset.path}`,
                    sizeBytes: asset.sizeBytes ?? asset.size ?? null,
                    mimeType: asset.mimeType ?? null,
                  };
                  onChange(mapped);
                  setOpen(false);
                }}
                onError={(message) => setError(message)}
              />
              <Button type="button" variant="ghost" size="sm" disabled={!value} onClick={() => onChange(null)}>
                Clear selection
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`music-search-${title.replace(/\s+/g, "-").toLowerCase()}`} className="text-xs">
                Search
              </Label>
              <Input
                id={`music-search-${title.replace(/\s+/g, "-").toLowerCase()}`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by filename"
              />
            </div>

            <div className="space-y-2 rounded-md border border-border bg-muted p-3">
              {value ? (
                <>
                  <p className="text-xs text-muted-foreground">Preview</p>
                  <audio controls src={value.url} className="w-full" />
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Select a track to preview.</p>
              )}
            </div>

            <div className="space-y-2">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={`skeleton-${idx}`} className="h-12 animate-pulse rounded-md bg-muted/60" />
                  ))}
                </div>
              ) : null}
              {!loading && items.length === 0 ? (
                <div className="rounded-md border border-border bg-muted p-4 text-sm text-muted-foreground">
                  No audio files yet.
                </div>
              ) : null}
              {!loading ? (
                <div className="space-y-1">
                  {items.map((item) => {
                    const selected = value?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onChange(item);
                          setOpen(false);
                        }}
                        className={[
                          "flex w-full items-start justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-accent",
                          selected ? "bg-muted" : "",
                        ].join(" ")}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{formatBytes(item.sizeBytes)}</p>
                        </div>
                        {selected ? <span className="text-xs font-medium text-foreground">Selected</span> : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
