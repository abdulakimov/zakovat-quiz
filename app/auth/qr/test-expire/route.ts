import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  sid: z.string().uuid(),
});

function isTestMode() {
  return process.env.NODE_ENV === "test" || process.env.PLAYWRIGHT_TEST === "1";
}

export async function POST(request: NextRequest) {
  if (!isTestMode()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  await prisma.qrLoginSession.update({
    where: { id: body.data.sid },
    data: {
      status: "EXPIRED",
      expiresAt: new Date(Date.now() - 1000),
    },
  });

  return NextResponse.json({ ok: true });
}
