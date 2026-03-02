import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { setUserSessionCookie } from "@/lib/auth-session";
import { upsertTelegramUser } from "@/lib/telegram-auth";
import {
  exchangeTelegramCodeForIdToken,
  getTelegramEnv,
  getTelegramEndpoints,
  TELEGRAM_FLOW_COOKIE,
  verifyTelegramFlowCookie,
  verifyTelegramIdToken,
} from "@/lib/telegram-oidc";
import { localizeHref, normalizeLocale } from "@/src/i18n/config";

function redirectToAuthError(request: NextRequest, locale: string, code: string) {
  const target = new URL(localizeHref(normalizeLocale(locale), "/auth/login"), request.url);
  target.searchParams.set("error", code);
  return NextResponse.redirect(target);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const cookieStore = await cookies();
  const flowToken = cookieStore.get(TELEGRAM_FLOW_COOKIE)?.value;

  if (!code || !state || !flowToken) {
    return redirectToAuthError(request, "uz", "telegram_oauth_failed");
  }

  const flow = await verifyTelegramFlowCookie(flowToken);
  if (!flow) {
    return redirectToAuthError(request, "uz", "telegram_oauth_failed");
  }

  if (flow.state !== state) {
    logger.warn("Telegram state mismatch");
    return redirectToAuthError(request, flow.locale, "telegram_oauth_invalid_state");
  }

  try {
    const env = getTelegramEnv();
    const endpoints = await getTelegramEndpoints();
    const idToken = await exchangeTelegramCodeForIdToken({
      tokenEndpoint: endpoints.tokenEndpoint,
      code,
      codeVerifier: flow.codeVerifier,
      redirectUri: env.TELEGRAM_OIDC_REDIRECT_URI,
      clientId: env.TELEGRAM_OIDC_CLIENT_ID,
      clientSecret: env.TELEGRAM_OIDC_CLIENT_SECRET,
    });

    const claims = await verifyTelegramIdToken({
      idToken,
      jwksUri: endpoints.jwksUri,
      clientId: env.TELEGRAM_OIDC_CLIENT_ID,
      nonce: flow.nonce,
    });

    const user = await upsertTelegramUser(claims);
    await setUserSessionCookie(user);

    const destination = new URL(localizeHref(normalizeLocale(flow.locale), "/app"), request.url);
    const response = NextResponse.redirect(destination);
    response.cookies.set(TELEGRAM_FLOW_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    logger.error("Telegram callback failed", { error });
    return redirectToAuthError(request, flow.locale, "telegram_oauth_failed");
  }
}
