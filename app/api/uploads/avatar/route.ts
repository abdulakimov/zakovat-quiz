import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, verifySessionToken } from "@/lib/session";

const UPLOAD_ROOT = process.env.UPLOAD_ROOT ?? path.join(process.cwd(), "data/uploads");
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function safeExtFromFile(fileName: string, mimeType: string) {
  const ext = path.extname(fileName).toLowerCase();
  const allowed = MIME_TO_EXT[mimeType];
  if (!allowed) return "";
  return ext && Object.values(MIME_TO_EXT).includes(ext) ? ext : allowed;
}

function readPngSize(buffer: Buffer) {
  if (buffer.length < 24) return null;
  if (buffer.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readJpegSize(buffer: Buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > buffer.length) break;
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) break;
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isSof && offset + 7 < buffer.length) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }
    offset += length;
  }
  return null;
}

function readWebpSize(buffer: Buffer) {
  if (buffer.length < 30) return null;
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunkType = buffer.toString("ascii", 12, 16);
  if (chunkType === "VP8X") {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }
  return null;
}

function getImageSize(buffer: Buffer, mimeType: string) {
  try {
    if (mimeType === "image/png") return readPngSize(buffer);
    if (mimeType === "image/jpeg") return readJpegSize(buffer);
    if (mimeType === "image/webp") return readWebpSize(buffer);
  } catch {
    return null;
  }
  return null;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  if (!token) return jsonError("Unauthorized", 401);
  const session = await verifySessionToken(token);
  if (!session) return jsonError("Unauthorized", 401);

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return jsonError("File is required.");

  if (!ALLOWED_MIME.has(file.type)) return jsonError("Only JPEG, PNG, and WebP images are allowed.");
  if (file.size <= 0) return jsonError("File is empty.");
  if (file.size > MAX_AVATAR_BYTES) return jsonError("Avatar image must be 2MB or smaller.", 413);

  const ext = safeExtFromFile(file.name || "avatar", file.type);
  const fileName = `${randomUUID()}${ext}`;
  const relativePath = path.posix.join("avatars", session.sub, fileName);
  const absoluteDir = path.resolve(UPLOAD_ROOT, "avatars", session.sub);
  const absolutePath = path.resolve(absoluteDir, fileName);

  const base = path.resolve(UPLOAD_ROOT);
  const relative = path.relative(base, absolutePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return jsonError("Invalid upload path", 400);

  await fs.mkdir(absoluteDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absolutePath, buffer);

  const dimensions = getImageSize(buffer, file.type);
  const asset = await prisma.mediaAsset.create({
    data: {
      ownerId: session.sub,
      type: "IMAGE",
      path: relativePath,
      originalName: file.name || "avatar",
      size: file.size,
      mimeType: file.type,
      sizeBytes: file.size,
      width: dimensions?.width ?? null,
      height: dimensions?.height ?? null,
    },
    select: { id: true, path: true },
  });

  return NextResponse.json({
    assetId: asset.id,
    url: `/api/media/${asset.path}`,
  });
}
