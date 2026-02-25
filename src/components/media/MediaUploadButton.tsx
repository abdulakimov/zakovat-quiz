"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

type UploadedAsset = {
  id: string;
  type: "IMAGE" | "AUDIO" | "VIDEO";
  path: string;
  originalName: string;
  url?: string;
  size?: number;
  sizeBytes?: number | null;
  mimeType?: string | null;
};

export function MediaUploadButton({
  mediaType,
  disabled,
  uploadUrl,
  onUploaded,
  onError,
}: {
  mediaType: "IMAGE" | "AUDIO" | "VIDEO";
  disabled?: boolean;
  uploadUrl?: string;
  onUploaded: (asset: UploadedAsset) => void;
  onError?: (message: string) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState<number>(0);

  const accept =
    mediaType === "IMAGE" ? "image/jpeg,image/png,image/webp,image/gif" :
    mediaType === "VIDEO" ? "video/mp4,video/webm,video/ogg" :
    "audio/mpeg,audio/wav,audio/ogg";

  const maxBytes =
    mediaType === "IMAGE" ? 3 * 1024 * 1024 :
    mediaType === "AUDIO" ? 15 * 1024 * 1024 :
    40 * 1024 * 1024;

  async function handleFile(file: File) {
    if (file.size > maxBytes) {
      onError?.(`${mediaType} file is too large. Max ${Math.round(maxBytes / (1024 * 1024))}MB.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const payload = await new Promise<UploadedAsset>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", uploadUrl ?? "/api/uploads");
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setProgress(Math.max(1, Math.round((event.loaded / event.total) * 100)));
          }
        };
        xhr.onload = () => {
          let parsed: unknown = {};
          try {
            parsed = JSON.parse(xhr.responseText || "{}");
          } catch {
            parsed = {};
          }
          if (xhr.status < 200 || xhr.status >= 300) {
            const message =
              typeof parsed === "object" && parsed !== null && "error" in parsed
                ? String((parsed as { error?: unknown }).error ?? "Upload failed.")
                : "Upload failed.";
            reject(new Error(message));
            return;
          }
          resolve(parsed as UploadedAsset);
        };
        xhr.onerror = () => reject(new Error("Upload failed."));
        const body = new FormData();
        body.append("file", file);
        xhr.send(body);
      });
      setProgress(100);
      onUploaded(payload);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? `Uploading ${progress}%` : "Upload new"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
    </>
  );
}
