import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  buildTelegramAuthUrl,
  createTelegramFlowValues,
  getTelegramEnv,
  getTelegramEndpoints,
  signTelegramFlowCookie,
  TELEGRAM_FLOW_COOKIE,
  TELEGRAM_FLOW_TTL_SECONDS,
} from "@/lib/telegram-oidc";
import { normalizeLocale } from "@/src/i18n/config";

export async function GET(request: Request) {
  try {
    const [env, headerStore, endpoints] = await Promise.all([
      Promise.resolve(getTelegramEnv()),
      headers(),
      getTelegramEndpoints(),
    ]);
    const locale = normalizeLocale(headerStore.get("x-locale"));
    const flow = createTelegramFlowValues();
    const flowCookie = await signTelegramFlowCookie({
      state: flow.state,
      nonce: flow.nonce,
      codeVerifier: flow.codeVerifier,
      locale,
    });

    const authUrl = buildTelegramAuthUrl({
      authorizationEndpoint: endpoints.authorizationEndpoint,
      clientId: env.TELEGRAM_OIDC_CLIENT_ID,
      redirectUri: env.TELEGRAM_OIDC_REDIRECT_URI,
      state: flow.state,
      nonce: flow.nonce,
      codeChallenge: flow.codeChallenge,
    });

    const response = NextResponse.redirect(authUrl);
    response.cookies.set(TELEGRAM_FLOW_COOKIE, flowCookie, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: TELEGRAM_FLOW_TTL_SECONDS,
    });

    return response;
  } catch (error) {
    logger.error("Telegram OIDC start failed", { error });
    return NextResponse.redirect(new URL("/auth/login?error=telegram_oauth_failed", request.url));
  }
}
