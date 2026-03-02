import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookieName, verifySessionToken } from "@/lib/session";
import {
  defaultLocale,
  getPathWithoutLocale,
  isAppLocale,
  localeCookieName,
  localizeHref,
  normalizeLocale,
  type AppLocale,
} from "@/src/i18n/config";

const PUBLIC_FILE = /\.[^/]+$/;
const TELEGRAM_AUTH_PATHS = new Set(["/auth/telegram/start", "/auth/telegram/callback"]);

function withLocale(url: URL, locale: AppLocale, pathname: string) {
  const localized = new URL(localizeHref(locale, pathname), url);
  localized.search = url.search;
  return localized;
}

function buildLoginRedirect(request: NextRequest, locale: AppLocale) {
  const loginUrl = withLocale(request.nextUrl, locale, "/auth/login");
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  loginUrl.searchParams.set("next", nextPath);
  return loginUrl;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || PUBLIC_FILE.test(pathname)) {
    return NextResponse.next();
  }
  if (TELEGRAM_AUTH_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const segments = pathname.split("/");
  const segmentLocale = segments[1];

  if (!isAppLocale(segmentLocale)) {
    const localeFromCookie = normalizeLocale(request.cookies.get(localeCookieName)?.value ?? defaultLocale);
    return NextResponse.redirect(withLocale(request.nextUrl, localeFromCookie, pathname));
  }

  const locale = segmentLocale;
  const rewrittenPathname = getPathWithoutLocale(pathname);

  if (rewrittenPathname.startsWith("/app")) {
    const token = request.cookies.get(getSessionCookieName())?.value;
    if (!token) {
      return NextResponse.redirect(buildLoginRedirect(request, locale));
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.redirect(buildLoginRedirect(request, locale));
    }

    if (rewrittenPathname.startsWith("/app/admin") && session.role !== "ADMIN") {
      return NextResponse.redirect(withLocale(request.nextUrl, locale, "/app"));
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-locale", locale);

  const rewrittenUrl = new URL(rewrittenPathname, request.url);
  rewrittenUrl.search = request.nextUrl.search;

  const response = NextResponse.rewrite(rewrittenUrl, {
    request: {
      headers: requestHeaders,
    },
  });
  response.cookies.set(localeCookieName, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
