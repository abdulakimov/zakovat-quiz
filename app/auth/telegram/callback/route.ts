import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { setUserSessionCookie } from "@/lib/auth-session";
import { upsertTelegramUser } from "@/lib/telegram-auth";
import {
  exchangeTelegramCodeForIdToken,
  getTelegramEndpoints,
  getTelegramEnv,
  resolveTelegramRedirectUri,
  TELEGRAM_FLOW_COOKIE,
  verifyTelegramFlowCookie,
  verifyTelegramStateToken,
  verifyTelegramIdToken,
} from "@/lib/telegram-oidc";
import {
  getCanonicalBaseUrl,
  getRedirectDebugMeta,
  isSecureBaseUrl,
  joinUrl,
  shouldDebugAuthLogs,
} from "@/src/lib/url";
import { defaultLocale, localeCookieName, localizeHref, normalizeLocale } from "@/src/i18n/config";

function redirectToAuthError(request: NextRequest, locale: string, code: string, baseUrl: string) {
  const target = new URL(joinUrl(baseUrl, localizeHref(normalizeLocale(locale), "/auth/login")));
  target.searchParams.set("error", code);
  if (shouldDebugAuthLogs()) {
    logger.info("Telegram callback error redirect decision", getRedirectDebugMeta(request.headers, target.toString()));
  }
  return NextResponse.redirect(target);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const callbackError = params.get("error");
  const code = params.get("code");
  const state = params.get("state");
  const baseUrl = getCanonicalBaseUrl(request.headers);
  const redirectUri = resolveTelegramRedirectUri(baseUrl);
  const secureCookies = isSecureBaseUrl(baseUrl);
  const cookieStore = await cookies();
  const flowToken = cookieStore.get(TELEGRAM_FLOW_COOKIE)?.value;
  const localeFromCookie = normalizeLocale(cookieStore.get(localeCookieName)?.value ?? defaultLocale);

  if (shouldDebugAuthLogs()) {
    logger.info("Telegram callback request", {
      ...getRedirectDebugMeta(request.headers, callbackError ? "telegram_oauth_failed" : "pending"),
      callbackUrl: request.url,
      hasCode: Boolean(code),
      hasState: Boolean(state),
      redirectUri,
    });
  }

  if (callbackError) {
    return redirectToAuthError(request, localeFromCookie, "telegram_oauth_failed", baseUrl);
  }

  if (!code || !state) {
    return redirectToAuthError(request, localeFromCookie, "telegram_oauth_failed", baseUrl);
  }

  const statePayload = await verifyTelegramStateToken(state);
  if (!statePayload) {
    return redirectToAuthError(request, localeFromCookie, "telegram_oauth_failed", baseUrl);
  }

  const flow = flowToken ? await verifyTelegramFlowCookie(flowToken) : null;
  if (flow && flow.state !== state) {
    logger.warn("Telegram state cookie mismatch; continuing with signed state token");
  }

  try {
    const env = getTelegramEnv();
    const endpoints = await getTelegramEndpoints();
    const idToken = await exchangeTelegramCodeForIdToken({
      tokenEndpoint: endpoints.tokenEndpoint,
      code,
      codeVerifier: statePayload.codeVerifier,
      redirectUri,
      clientId: env.TELEGRAM_OIDC_CLIENT_ID,
      clientSecret: env.TELEGRAM_OIDC_CLIENT_SECRET,
    });

    const claims = await verifyTelegramIdToken({
      idToken,
      jwksUri: endpoints.jwksUri,
      clientId: env.TELEGRAM_OIDC_CLIENT_ID,
      nonce: statePayload.nonce,
    });

    const user = await upsertTelegramUser(claims);
    await setUserSessionCookie(user, { secure: secureCookies });

    const destination = new URL(
      joinUrl(baseUrl, statePayload.nextPath || localizeHref(normalizeLocale(statePayload.locale), "/app")),
    );
    if (shouldDebugAuthLogs()) {
      logger.info("Telegram callback success redirect decision", getRedirectDebugMeta(request.headers, destination.toString()));
    }
    const response = NextResponse.redirect(destination);
    response.cookies.set(TELEGRAM_FLOW_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookies,
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    logger.error("Telegram callback failed", { error });
    return redirectToAuthError(request, statePayload.locale, "telegram_oauth_failed", baseUrl);
  }
}
