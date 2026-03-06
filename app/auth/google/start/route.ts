import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  buildGoogleAuthUrl,
  createGoogleFlowValues,
  getGoogleEndpoints,
  getGoogleEnv,
  getGoogleScopes,
  GOOGLE_FLOW_COOKIE,
  GOOGLE_FLOW_TTL_SECONDS,
  resolveGoogleRedirectUri,
  signGoogleFlowCookie,
} from "@/src/auth/providers/google";
import { getCanonicalBaseUrl, getRedirectDebugMeta, isSecureBaseUrl, joinUrl, shouldDebugAuthLogs } from "@/src/lib/url";
import { defaultLocale, localeCookieName, localizeHref, normalizeLocale } from "@/src/i18n/config";

export async function GET() {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(localeCookieName)?.value ?? headerStore.get("x-locale") ?? defaultLocale);
  const baseUrl = getCanonicalBaseUrl(headerStore);

  try {
    const redirectUri = resolveGoogleRedirectUri(baseUrl);
    const secureCookies = isSecureBaseUrl(baseUrl);
    const env = getGoogleEnv();
    const endpoints = getGoogleEndpoints();
    const flow = createGoogleFlowValues();
    const flowCookie = await signGoogleFlowCookie({
      state: flow.state,
      nonce: flow.nonce,
      codeVerifier: flow.codeVerifier,
      locale,
    });

    const authUrl = buildGoogleAuthUrl({
      authorizationEndpoint: endpoints.authorizationEndpoint,
      clientId: env.GOOGLE_OIDC_CLIENT_ID,
      redirectUri,
      scope: getGoogleScopes(),
      state: flow.state,
      nonce: flow.nonce,
      codeChallenge: flow.codeChallenge,
    });

    if (shouldDebugAuthLogs()) {
      logger.info("Google OIDC redirect decision", {
        ...getRedirectDebugMeta(headerStore, authUrl.toString()),
        redirectUri,
      });
    }

    const response = NextResponse.redirect(authUrl);
    response.cookies.set(GOOGLE_FLOW_COOKIE, flowCookie, {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookies,
      path: "/",
      maxAge: GOOGLE_FLOW_TTL_SECONDS,
    });

    return response;
  } catch (error) {
    logger.error("Google OIDC start failed", { error });
    const loginUrl = new URL(joinUrl(baseUrl, localizeHref(locale, "/auth/login")));
    loginUrl.searchParams.set("error", "google_oauth_failed");
    if (shouldDebugAuthLogs()) {
      logger.info("Google start error redirect decision", getRedirectDebugMeta(headerStore, loginUrl.toString()));
    }
    return NextResponse.redirect(loginUrl);
  }
}
