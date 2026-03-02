import { NextRequest, NextResponse } from "next/server";
import { clearUserSessionCookie } from "@/lib/auth-session";
import { localizeHref, normalizeLocale } from "@/src/i18n/config";

export async function POST(request: NextRequest) {
  await clearUserSessionCookie();
  const locale = normalizeLocale(request.headers.get("x-locale"));
  return NextResponse.redirect(new URL(localizeHref(locale, "/auth/login"), request.url));
}
