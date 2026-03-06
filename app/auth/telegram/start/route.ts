import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  buildTelegramAuthUrl,
  createTelegramFlowValues,
  getTelegramEnv,
  getTelegramEndpoints,
  resolveTelegramRedirectUri,
  signTelegramFlowCookie,
  signTelegramStateToken,
  TELEGRAM_FLOW_COOKIE,
  TELEGRAM_FLOW_TTL_SECONDS,
} from "@/lib/telegram-oidc";
import { normalizeOAuthNextPath } from "@/src/auth/providers/next-path";
import { getCanonicalBaseUrl, getRedirectDebugMeta, isSecureBaseUrl, joinUrl, shouldDebugAuthLogs } from "@/src/lib/url";
import { defaultLocale, localeCookieName, localizeHref, normalizeLocale } from "@/src/i18n/config";

export async function GET(request: Request) {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(localeCookieName)?.value ?? headerStore.get("x-locale") ?? defaultLocale);
  const nextPath = normalizeOAuthNextPath(new URL(request.url).searchParams.get("next"), locale);
  const baseUrl = getCanonicalBaseUrl(headerStore);
  const redirectUri = resolveTelegramRedirectUri(baseUrl);
  const secureCookies = isSecureBaseUrl(baseUrl);

  try {
    const [env, endpoints] = await Promise.all([
      Promise.resolve(getTelegramEnv()),
      getTelegramEndpoints(),
    ]);
    const flow = createTelegramFlowValues();
    const stateToken = await signTelegramStateToken({
      nonce: flow.nonce,
      codeVerifier: flow.codeVerifier,
      locale,
      csrf: flow.state,
      nextPath,
    });
    const flowCookie = await signTelegramFlowCookie({
      state: stateToken,
      nonce: flow.nonce,
      codeVerifier: flow.codeVerifier,
      locale,
      nextPath,
    });

    const authUrl = buildTelegramAuthUrl({
      authorizationEndpoint: endpoints.authorizationEndpoint,
      clientId: env.TELEGRAM_OIDC_CLIENT_ID,
      redirectUri,
      state: stateToken,
      nonce: flow.nonce,
      codeChallenge: flow.codeChallenge,
    });

    if (shouldDebugAuthLogs()) {
      logger.info("Telegram OIDC redirect decision", {
        ...getRedirectDebugMeta(headerStore, authUrl.toString()),
        redirectUri,
      });
    }

    const response = NextResponse.redirect(authUrl);
    response.cookies.set(TELEGRAM_FLOW_COOKIE, flowCookie, {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookies,
      path: "/",
      maxAge: TELEGRAM_FLOW_TTL_SECONDS,
    });

    return response;
  } catch (error) {
    logger.error("Telegram OIDC start failed", { error });
    const loginUrl = new URL(joinUrl(baseUrl, localizeHref(locale, "/auth/login")));
    loginUrl.searchParams.set("error", "telegram_oauth_failed");
    if (shouldDebugAuthLogs()) {
      logger.info("Telegram start error redirect decision", getRedirectDebugMeta(headerStore, loginUrl.toString()));
    }
    return NextResponse.redirect(loginUrl);
  }
}
