"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/src/components/layout/PageHeader";

type Asset = {
  id: string;
  type: "IMAGE" | "AUDIO" | "VIDEO";
  path: string;
  originalName: string;
  size: number;
};

export default function UploadsPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [asset, setAsset] = React.useState<Asset | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/uploads", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? "Upload failed");
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as Asset;
    setAsset(payload);
    setLoading(false);
  }

  const mediaUrl = asset ? `/api/media/${asset.path}` : null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Uploads"
        description="Upload an image, audio, or video file."
        breadcrumbs={[
          { label: "App", href: "/app" },
          { label: "Uploads" },
        ]}
      />

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm"
      >
        <div className="space-y-2">
          <Label htmlFor="file">File</Label>
          <Input
            id="file"
            name="file"
            type="file"
            accept="image/*,audio/*,video/*"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            required
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={loading}>
          {loading ? "Uploading..." : "Upload"}
        </Button>
      </form>

      {asset && mediaUrl ? (
        <div className="space-y-2 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="text-sm text-muted-foreground">{asset.originalName}</div>
          {asset.type === "IMAGE" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl} alt={asset.originalName} className="max-w-md rounded-lg" />
          ) : null}
          {asset.type === "AUDIO" ? (
            <audio controls src={mediaUrl} className="w-full" />
          ) : null}
          {asset.type === "VIDEO" ? (
            <video controls src={mediaUrl} className="w-full max-w-xl" />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
