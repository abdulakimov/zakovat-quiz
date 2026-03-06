import QRCode from "qrcode";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCanonicalBaseUrl, isSecureBaseUrl, joinUrl } from "@/src/lib/url";
import {
  createQrExpiryDate,
  createQrToken,
  hashQrToken,
  QR_LOGIN_TTL_SECONDS,
  QR_SESSION_COOKIE,
  QR_TOKEN_COOKIE,
} from "@/src/lib/qr-login";

export async function POST() {
  const headerStore = await headers();
  const baseUrl = getCanonicalBaseUrl(headerStore);
  const secureCookies = isSecureBaseUrl(baseUrl);
  const token = createQrToken();
  const expiresAt = createQrExpiryDate();
  const tokenHash = hashQrToken(token);

  const session = await prisma.qrLoginSession.create({
    data: {
      tokenHash,
      status: "PENDING",
      expiresAt,
      userAgent: headerStore.get("user-agent"),
      ip: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headerStore.get("x-real-ip") ?? null,
    },
    select: {
      id: true,
      expiresAt: true,
    },
  });

  const qrUrl = joinUrl(baseUrl, `/auth/qr?t=${encodeURIComponent(token)}`);
  const qrDataUrl = await QRCode.toDataURL(qrUrl, {
    margin: 1,
    width: 260,
  });

  const response = NextResponse.json({
    qrUrl,
    qrDataUrl,
    expiresAt: session.expiresAt.toISOString(),
    sessionId: session.id,
  });

  response.cookies.set(QR_SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies,
    path: "/",
    maxAge: QR_LOGIN_TTL_SECONDS,
  });
  response.cookies.set(QR_TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies,
    path: "/",
    maxAge: QR_LOGIN_TTL_SECONDS,
  });

  return response;
}
