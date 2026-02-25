"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaUploadButton } from "@/src/components/media/MediaUploadButton";

export type AudioLibraryAsset = {
  id: string;
  name: string;
  url: string;
  path?: string;
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

function formatDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export function AudioLibraryPicker({
  label = "Audio",
  value,
  onChange,
  disabled,
}: {
  label?: string;
  value: AudioLibraryAsset | null;
  onChange: (assetId: string, asset?: AudioLibraryAsset) => void;
  disabled?: boolean;
}) {
  const [tab, setTab] = React.useState<"upload" | "library">("library");
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<AudioLibraryAsset[]>([]);

  React.useEffect(() => {
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
          ? (payload.items as ApiAudioItem[]).map((item) => ({
              id: item.id,
              name: item.originalName,
              url: item.url,
              path: item.path,
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
    }, 250);

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-900">{label}</p>
          <p className="text-xs text-slate-500">Upload or choose an audio file from your library.</p>
        </div>
        <div className="inline-flex rounded-md border border-slate-200 p-0.5">
          <Button type="button" size="sm" variant={tab === "library" ? "default" : "ghost"} disabled={disabled} onClick={() => setTab("library")}>
            Library
          </Button>
          <Button type="button" size="sm" variant={tab === "upload" ? "default" : "ghost"} disabled={disabled} onClick={() => setTab("upload")}>
            Upload
          </Button>
        </div>
      </div>

      {tab === "upload" ? (
        <div className="space-y-2">
          <MediaUploadButton
            mediaType="AUDIO"
            uploadUrl="/api/uploads/audio"
            disabled={disabled}
            onUploaded={(asset) => {
              const mapped: AudioLibraryAsset = {
                id: asset.id,
                name: asset.originalName,
                url: asset.url ?? `/api/media/${asset.path}`,
                path: asset.path,
                sizeBytes: asset.sizeBytes ?? asset.size ?? null,
                mimeType: asset.mimeType ?? null,
              };
              setError(null);
              onChange(mapped.id, mapped);
            }}
            onError={(message) => setError(message)}
          />
          <p className="text-xs text-slate-500">Supports MP3/WAV/OGG up to 15MB.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor={`audio-library-search-${label.replace(/\s+/g, "-").toLowerCase()}`} className="text-xs">
              Search audio
            </Label>
            <Input
              id={`audio-library-search-${label.replace(/\s+/g, "-").toLowerCase()}`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by filename"
              disabled={disabled}
            />
          </div>
          <div className="max-h-60 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
            {loading ? <p className="text-sm text-slate-500">Loading audio...</p> : null}
            {!loading && items.length === 0 ? <p className="text-sm text-slate-500">No matching audio files.</p> : null}
            {items.map((item) => {
              const selected = value?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(item.id, item)}
                  className={[
                    "flex w-full items-start justify-between gap-3 rounded-md px-2 py-2 text-left hover:bg-slate-50",
                    selected ? "bg-slate-100" : "",
                  ].join(" ")}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      {formatBytes(item.sizeBytes)}
                      {formatDate(item.createdAt) ? ` | ${formatDate(item.createdAt)}` : ""}
                    </p>
                  </div>
                  {selected ? <span className="text-xs font-medium text-slate-700">Selected</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="space-y-2 rounded-md border border-slate-200 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Selected</p>
        {value ? (
          <>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{value.name}</p>
              <p className="text-xs text-slate-500">{formatBytes(value.sizeBytes)}</p>
            </div>
            <audio controls src={value.url} className="w-full" />
            <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => onChange("")}>
              Clear selection
            </Button>
          </>
        ) : (
          <p className="text-sm text-slate-500">No audio selected.</p>
        )}
      </div>
    </div>
  );
}
