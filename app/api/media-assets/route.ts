import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, verifySessionToken } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const q = (url.searchParams.get("query") ?? "").trim();

  if (type !== "IMAGE" && type !== "AUDIO" && type !== "VIDEO") {
    return NextResponse.json({ error: "Invalid media type" }, { status: 400 });
  }

  const items = await prisma.mediaAsset.findMany({
    where: {
      ownerId: session.sub,
      type,
      ...(q
        ? {
            originalName: {
              contains: q,
              mode: "insensitive",
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      type: true,
      originalName: true,
      path: true,
      size: true,
      sizeBytes: true,
      mimeType: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    items: items.map((item) => ({
      ...item,
      url: `/api/media/${item.path}`,
    })),
  });
}
