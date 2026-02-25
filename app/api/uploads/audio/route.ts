import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, verifySessionToken } from "@/lib/session";

const UPLOAD_ROOT = process.env.UPLOAD_ROOT ?? path.join(process.cwd(), "data/uploads");

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/ogg": ".ogg",
};

const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

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

  const mimeType = file.type;
  const extFromMime = ALLOWED_MIME_TO_EXT[mimeType];
  if (!extFromMime) {
    return NextResponse.json({ error: "Unsupported audio format. Use mp3, wav, or ogg." }, { status: 400 });
  }

  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "Audio file is too large. Max 15MB." }, { status: 413 });
  }

  const originalName = file.name || "audio";
  const ext = path.extname(originalName) || extFromMime;
  const fileName = `${randomUUID()}${ext}`;
  const relativePath = path.posix.join("audio", session.sub, fileName);
  const absoluteDir = path.resolve(UPLOAD_ROOT, "audio", session.sub);
  const absolutePath = path.resolve(absoluteDir, fileName);

  await fs.mkdir(absoluteDir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absolutePath, bytes);

  const asset = await prisma.mediaAsset.create({
    data: {
      ownerId: session.sub,
      type: "AUDIO",
      path: relativePath,
      originalName,
      size: file.size,
      sizeBytes: file.size,
      mimeType: mimeType || null,
    },
    select: {
      id: true,
      type: true,
      path: true,
      originalName: true,
      size: true,
      sizeBytes: true,
      mimeType: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    ...asset,
    url: `/api/media/${asset.path}`,
  });
}
