import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import fsp from "fs/promises";

const UPLOAD_ROOT =
  process.env.UPLOAD_ROOT ?? path.join(process.cwd(), "data/uploads");

const EXT_TO_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogv": "video/ogg",
};

export const runtime = "nodejs";

const IMMUTABLE_FILE_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.[a-z0-9]+$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const resolved = await params;
  const parts =
    resolved.path?.flatMap((segment) =>
      segment.split("/").filter(Boolean)
    ) ?? [];
  if (parts.length === 0) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  if (parts.some((part) => part === "." || part === ".." || part.includes("\0"))) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const base = path.resolve(UPLOAD_ROOT);
  const target = path.resolve(base, ...parts);
  const relative = path.relative(base, target);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const realBase = await fsp.realpath(base).catch(() => base);
    const realTarget = await fsp.realpath(target);
    const realRelative = path.relative(realBase, realTarget);
    if (realRelative.startsWith("..") || path.isAbsolute(realRelative)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const stat = await fsp.stat(realTarget);
    if (!stat.isFile()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const ext = path.extname(realTarget).toLowerCase();
    const contentType = EXT_TO_MIME[ext] ?? "application/octet-stream";
    const fileName = path.basename(realTarget);
    const isImmutableSafe = IMMUTABLE_FILE_RE.test(fileName);

    const stream = fs.createReadStream(realTarget);
    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": stat.size.toString(),
        "X-Content-Type-Options": "nosniff",
        ...(isImmutableSafe
          ? { "Cache-Control": "public, max-age=31536000, immutable" }
          : { "Cache-Control": "public, max-age=60" }),
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
