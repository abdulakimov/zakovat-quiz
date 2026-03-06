import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/src/lib/rate-limit";
import { getClientIp, isQrExpired } from "@/src/lib/qr-login";

const querySchema = z.object({
  sid: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse({
    sid: request.nextUrl.searchParams.get("sid"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_session" }, { status: 400 });
  }

  const ip = await getClientIp();
  const rate = consumeRateLimit({
    bucket: "auth:qr:status",
    key: `${parsed.data.sid}:${ip}`,
    limit: 60,
    windowMs: 60 * 1000,
  });
  if (!rate.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const session = await prisma.qrLoginSession.findUnique({
    where: { id: parsed.data.sid },
    select: {
      id: true,
      status: true,
      expiresAt: true,
    },
  });
  if (!session) {
    return NextResponse.json({ status: "EXPIRED", expiresAt: new Date(0).toISOString() }, { status: 404 });
  }

  if (session.status !== "EXPIRED" && isQrExpired(session.expiresAt)) {
    await prisma.qrLoginSession.update({
      where: { id: session.id },
      data: { status: "EXPIRED" },
    });
    return NextResponse.json({ status: "EXPIRED", expiresAt: session.expiresAt.toISOString() });
  }

  return NextResponse.json({
    status: session.status,
    expiresAt: session.expiresAt.toISOString(),
    approved: session.status === "APPROVED",
  });
}
