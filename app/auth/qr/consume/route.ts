import { cookies, headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { setUserSessionCookie } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { getCanonicalBaseUrl, isSecureBaseUrl } from "@/src/lib/url";
import { hashQrToken, isQrExpired, QR_TOKEN_COOKIE, resolvePostConsumeRedirect } from "@/src/lib/qr-login";

const bodySchema = z.object({
  sid: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const parsedBody = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsedBody.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(QR_TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 401 });
  }
  const tokenHash = hashQrToken(token);

  const session = await prisma.qrLoginSession.findUnique({
    where: { id: parsedBody.data.sid },
    select: {
      id: true,
      tokenHash: true,
      status: true,
      expiresAt: true,
      approvedUserId: true,
    },
  });

  if (!session || session.tokenHash !== tokenHash) {
    return NextResponse.json({ error: "invalid_session" }, { status: 404 });
  }

  if (isQrExpired(session.expiresAt)) {
    if (session.status !== "EXPIRED") {
      await prisma.qrLoginSession.update({
        where: { id: session.id },
        data: { status: "EXPIRED" },
      });
    }
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  if (session.status !== "APPROVED" || !session.approvedUserId) {
    return NextResponse.json({ error: "not_approved" }, { status: 409 });
  }

  const consumed = await prisma.qrLoginSession.updateMany({
    where: {
      id: session.id,
      status: "APPROVED",
      approvedUserId: { not: null },
      expiresAt: { gt: new Date() },
    },
    data: {
      status: "CONSUMED",
      consumedAt: new Date(),
    },
  });
  if (consumed.count !== 1) {
    return NextResponse.json({ error: "already_consumed" }, { status: 409 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.approvedUserId },
    select: {
      id: true,
      role: true,
      username: true,
      name: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const headerStore = await headers();
  const baseUrl = getCanonicalBaseUrl(headerStore);
  await setUserSessionCookie(user, { secure: isSecureBaseUrl(baseUrl) });

  return NextResponse.json({
    redirectTo: await resolvePostConsumeRedirect(),
  });
}
