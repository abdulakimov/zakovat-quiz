"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaUploadButton } from "@/src/components/media/MediaUploadButton";

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
  if (!bytes || bytes <= 0) return null;
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
    return <img src={asset.url} alt={asset.name} className="max-h-40 rounded-md border border-border object-contain" />;
  }
  if (asset.type === "VIDEO") {
    return <video controls src={asset.url} className="max-h-48 w-full rounded-md border border-border" />;
  }
  return <audio controls src={asset.url} className="w-full" />;
}

export function PrimaryMediaPicker({
  allowed,
  value,
  onChange,
  disabled,
  title = "Primary media",
  description,
}: {
  allowed: AllowedType;
  value: MediaPickerAsset | null;
  onChange: (assetId: string, asset?: MediaPickerAsset) => void;
  disabled?: boolean;
  title?: string;
  description?: string;
}) {
  const [tab, setTab] = React.useState<"upload" | "library">("upload");
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<MediaPickerAsset[]>([]);
  const [uploadedAsset, setUploadedAsset] = React.useState<MediaPickerAsset | null>(null);

  React.useEffect(() => {
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
        if (active) {
          setItems(next);
        }
      } catch (e) {
        if (!active || (e instanceof DOMException && e.name === "AbortError")) return;
        setError(e instanceof Error ? e.message : "Failed to load media library.");
      } finally {
        if (active) setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [allowed, query]);

  const selected = value ?? uploadedAsset;

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">
            {description ?? `Upload a new ${allowed.toLowerCase()} or pick from your library.`}
          </p>
        </div>
        <div className="inline-flex rounded-md border border-border p-0.5">
          <Button
            type="button"
            variant={tab === "upload" ? "default" : "ghost"}
            size="sm"
            disabled={disabled}
            onClick={() => setTab("upload")}
          >
            Upload
          </Button>
          <Button
            type="button"
            variant={tab === "library" ? "default" : "ghost"}
            size="sm"
            disabled={disabled}
            onClick={() => setTab("library")}
          >
            Library
          </Button>
        </div>
      </div>

      {tab === "upload" ? (
        <div className="space-y-2">
          <MediaUploadButton
            mediaType={allowed}
            disabled={disabled}
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
              setUploadedAsset(mapped);
              setError(null);
              onChange(mapped.id, mapped);
            }}
            onError={(message) => setError(message)}
          />
          <p className="text-xs text-muted-foreground">
            {allowed === "IMAGE" ? "JPEG/PNG/WEBP up to 3MB." : allowed === "AUDIO" ? "Audio up to 15MB." : "Video up to 40MB."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor={`media-library-search-${allowed.toLowerCase()}`} className="text-xs">
              Search library
            </Label>
            <Input
              id={`media-library-search-${allowed.toLowerCase()}`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by filename"
              disabled={disabled}
            />
          </div>
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border p-2">
            {loading ? <p className="text-sm text-muted-foreground">Loading media...</p> : null}
            {!loading && items.length === 0 ? <p className="text-sm text-muted-foreground">No matching assets.</p> : null}
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={disabled}
                onClick={() => onChange(item.id, item)}
                className={[
                  "flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-accent",
                  value?.id === item.id ? "bg-muted" : "",
                ].join(" ")}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.type}
                    {formatBytes(item.sizeBytes) ? ` | ${formatBytes(item.sizeBytes)}` : ""}
                  </p>
                </div>
                {value?.id === item.id ? <span className="text-xs text-foreground">Selected</span> : null}
              </button>
            ))}
          </div>
        </div>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <MediaThumb asset={selected} />
    </div>
  );
}
