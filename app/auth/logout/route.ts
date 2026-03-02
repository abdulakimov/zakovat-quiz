import { NextRequest, NextResponse } from "next/server";
import { clearUserSessionCookie } from "@/lib/auth-session";
import { getCanonicalBaseUrl, getRedirectDebugMeta, joinUrl, shouldDebugAuthLogs } from "@/src/lib/url";
import { defaultLocale, localeCookieName, localizeHref, normalizeLocale } from "@/src/i18n/config";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  await clearUserSessionCookie();
  const locale = normalizeLocale(
    request.cookies.get(localeCookieName)?.value ?? request.headers.get("x-locale") ?? defaultLocale,
  );
  const baseUrl = getCanonicalBaseUrl(request.headers);
  const target = joinUrl(baseUrl, localizeHref(locale, "/auth/login"));
  if (shouldDebugAuthLogs()) {
    logger.info("Logout redirect decision", getRedirectDebugMeta(request.headers, target));
  }
  return NextResponse.redirect(new URL(target));
}
