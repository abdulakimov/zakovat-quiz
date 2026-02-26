import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, verifySessionToken } from "@/lib/session";

const UPLOAD_ROOT =
  process.env.UPLOAD_ROOT ?? path.join(process.cwd(), "data/uploads");

const MIME_TO_TYPE: Record<string, "IMAGE" | "AUDIO" | "VIDEO"> = {
  "image/png": "IMAGE",
  "image/jpeg": "IMAGE",
  "image/webp": "IMAGE",
  "image/gif": "IMAGE",
  "audio/mpeg": "AUDIO",
  "audio/mp3": "AUDIO",
  "audio/x-mp3": "AUDIO",
  "audio/wav": "AUDIO",
  "audio/ogg": "AUDIO",
  "video/mp4": "VIDEO",
  "video/webm": "VIDEO",
  "video/ogg": "VIDEO",
};

const MIME_TO_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/x-mp3": ".mp3",
  "audio/wav": ".wav",
  "audio/ogg": ".ogg",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/ogg": ".ogv",
};

const AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".ogg"]);

const MAX_BYTES_BY_TYPE: Record<"IMAGE" | "AUDIO" | "VIDEO", number> = {
  IMAGE: 3 * 1024 * 1024,
  AUDIO: 15 * 1024 * 1024,
  VIDEO: 40 * 1024 * 1024,
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  const mime = file.type;
  const originalName = file.name || "upload";
  const extFromName = path.extname(originalName).toLowerCase();
  const assetType = MIME_TO_TYPE[mime] ?? (AUDIO_EXTENSIONS.has(extFromName) ? "AUDIO" : undefined);
  if (!assetType) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  const maxBytes = MAX_BYTES_BY_TYPE[assetType];
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `${assetType} file is too large. Max ${Math.round(maxBytes / (1024 * 1024))}MB.` },
      { status: 413 },
    );
  }
  const ext = extFromName || MIME_TO_EXT[mime] || "";
  const fileName = `${randomUUID()}${ext}`;
  const relativePath = path.posix.join("media", session.sub, fileName);
  const absoluteDir = path.resolve(UPLOAD_ROOT, "media", session.sub);
  const absolutePath = path.resolve(absoluteDir, fileName);

  await fs.mkdir(absoluteDir, { recursive: true });

  const arrayBuffer = await file.arrayBuffer();
  await fs.writeFile(absolutePath, Buffer.from(arrayBuffer));

  const asset = await prisma.mediaAsset.create({
    data: {
      ownerId: session.sub,
      type: assetType,
      path: relativePath,
      originalName,
      size: file.size,
      sizeBytes: file.size,
      mimeType: mime || null,
    },
    select: {
      id: true,
      type: true,
      path: true,
      originalName: true,
      size: true,
      sizeBytes: true,
      mimeType: true,
    },
  });

  return NextResponse.json({
    ...asset,
    url: `/api/media/${asset.path}`,
  });
}
