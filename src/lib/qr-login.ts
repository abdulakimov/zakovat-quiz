import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { defaultLocale, localeCookieName, localizeHref, normalizeLocale } from "@/src/i18n/config";

export const QR_LOGIN_TTL_MS = 5 * 60 * 1000;
export const QR_LOGIN_TTL_SECONDS = Math.floor(QR_LOGIN_TTL_MS / 1000);
export const QR_TOKEN_COOKIE = "qr_token";
export const QR_SESSION_COOKIE = "qr_sid";

export function createQrToken() {
  return randomBytes(32).toString("base64url");
}

export function hashQrToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createQrExpiryDate() {
  return new Date(Date.now() + QR_LOGIN_TTL_MS);
}

export function isQrExpired(expiresAt: Date | string) {
  return new Date(expiresAt).getTime() <= Date.now();
}

export async function getClientIp() {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  const realIp = headerStore.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

export async function resolvePostConsumeRedirect() {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(localeCookieName)?.value ?? defaultLocale);
  return localizeHref(locale, "/app");
}
