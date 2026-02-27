"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaUploadButton } from "@/src/components/media/MediaUploadButton";
import { EyeIcon, PauseIcon, PlayIcon } from "@/src/ui/icons";

type AllowedType = "IMAGE" | "VIDEO" | "AUDIO";

export type MediaPickerAsset = {
  id: string;
  url: string;
  name: string;
  type: AllowedType;
  path?: string;
  sizeBytes?: number | null;
  mimeType?: string | null;
};

type ApiMediaItem = {
  id: string;
  type: AllowedType;
  originalName: string;
  url: string;
  path: string;
  size?: number;
  sizeBytes?: number | null;
  mimeType?: string | null;
};

function formatBytes(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MediaThumb({ asset }: { asset: MediaPickerAsset | null }) {
  if (!asset) {
    return <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">No media selected</div>;
  }
  if (asset.type === "IMAGE") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={asset.url} alt={asset.name} className="max-h-44 w-full rounded-md border border-border object-contain" />;
  }
  if (asset.type === "VIDEO") {
    return <video controls src={asset.url} className="max-h-56 w-full rounded-md border border-border" />;
  }
  return <audio controls src={asset.url} className="w-full" />;
}

export function MediaPickerSheet({
  title,
  allowed,
  value,
  onChange,
  disabled,
  description,
}: {
  title: string;
  allowed: AllowedType;
  value: MediaPickerAsset | null;
  onChange: (asset: MediaPickerAsset | null) => void;
  disabled?: boolean;
  description?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<MediaPickerAsset[]>([]);
  const [showPreview, setShowPreview] = React.useState(false);
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
        const params = new URLSearchParams({ type: allowed });
        if (query.trim()) params.set("query", query.trim());
        const res = await fetch(`/api/media-assets?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.error ?? "Failed to load media library.");
        const next = Array.isArray(payload.items)
          ? (payload.items as ApiMediaItem[]).map((item) => ({
              id: item.id,
              type: item.type,
              url: item.url,
              name: item.originalName,
              path: item.path,
              sizeBytes: item.sizeBytes ?? item.size ?? null,
              mimeType: item.mimeType ?? null,
            }))
          : [];
        if (active) setItems(next.slice(0, 20));
      } catch (e) {
        if (!active || (e instanceof DOMException && e.name === "AbortError")) return;
        setError(e instanceof Error ? e.message : "Failed to load media library.");
      } finally {
        if (active) setLoading(false);
      }
    }, 200);

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [allowed, open, query]);

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
    if (!value || value.type !== "AUDIO") {
      setShowPreview((prev) => !prev);
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
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
          <p className="text-xs text-muted-foreground">
            {description ?? `Choose a ${allowed.toLowerCase()} asset from your library or upload a new one.`}
          </p>
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
          <span className="text-xs text-muted-foreground">No media selected.</span>
        )}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={!value}
          onClick={togglePreview}
          aria-label="Preview media"
        >
          {value?.type === "AUDIO" ? (playing ? <PauseIcon className="h-3.5 w-3.5" /> : <PlayIcon className="h-3.5 w-3.5" />) : <EyeIcon className="h-3.5 w-3.5" />}
        </Button>
        {value?.type === "AUDIO" ? <audio ref={audioRef} className="hidden" /> : null}
      </div>

      {showPreview && value ? (
        <div className="rounded-lg border border-border bg-card p-3">
          <MediaThumb asset={value} />
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-full max-w-lg flex-col gap-4 overflow-y-auto border-l border-border bg-background p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Choose media</p>
                <p className="text-xs text-muted-foreground">Select an asset for {title.toLowerCase()}.</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <MediaUploadButton
                mediaType={allowed}
                onUploaded={(asset) => {
                  const mapped: MediaPickerAsset = {
                    id: asset.id,
                    type: asset.type,
                    url: asset.url ?? `/api/media/${asset.path}`,
                    name: asset.originalName,
                    path: asset.path,
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
              <Label htmlFor={`media-search-${title.replace(/\s+/g, "-").toLowerCase()}`} className="text-xs">
                Search
              </Label>
              <Input
                id={`media-search-${title.replace(/\s+/g, "-").toLowerCase()}`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by filename"
              />
            </div>

            <div className="space-y-2">
              <div className="rounded-md border border-border bg-muted p-3">
                <MediaThumb asset={value} />
              </div>
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
                  No matching assets.
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
                          <p className="text-xs text-muted-foreground">
                            {item.type} | {formatBytes(item.sizeBytes)}
                          </p>
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
