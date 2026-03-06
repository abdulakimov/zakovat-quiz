import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { setUserSessionCookie } from "@/lib/auth-session";
import { upsertGoogleUser } from "@/lib/google-auth";
import {
  exchangeGoogleCodeForIdToken,
  getGoogleEndpoints,
  getGoogleEnv,
  GOOGLE_FLOW_COOKIE,
  resolveGoogleRedirectUri,
  verifyGoogleFlowCookie,
  verifyGoogleIdToken,
} from "@/src/auth/providers/google";
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
    logger.info("Google callback error redirect decision", getRedirectDebugMeta(request.headers, target.toString()));
  }
  return NextResponse.redirect(target);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const callbackError = params.get("error");
  const code = params.get("code");
  const state = params.get("state");
  const baseUrl = getCanonicalBaseUrl(request.headers);
  const cookieStore = await cookies();
  const flowToken = cookieStore.get(GOOGLE_FLOW_COOKIE)?.value;
  const localeFromCookie = normalizeLocale(cookieStore.get(localeCookieName)?.value ?? defaultLocale);
  const flow = flowToken ? await verifyGoogleFlowCookie(flowToken) : null;
  const secureCookies = isSecureBaseUrl(baseUrl);

  let redirectUri = "";
  try {
    redirectUri = resolveGoogleRedirectUri(baseUrl);
  } catch (error) {
    logger.error("Google callback setup failed", { error });
    return redirectToAuthError(request, localeFromCookie, "google_oauth_failed", baseUrl);
  }

  if (shouldDebugAuthLogs()) {
    logger.info("Google callback request", {
      ...getRedirectDebugMeta(request.headers, callbackError ? "google_oauth_failed" : "pending"),
      callbackUrl: request.url,
      hasCode: Boolean(code),
      hasState: Boolean(state),
      redirectUri,
    });
  }

  if (callbackError) {
    return redirectToAuthError(request, localeFromCookie, "google_oauth_failed", baseUrl);
  }

  if (!code || !state || !flow) {
    return redirectToAuthError(request, localeFromCookie, "google_oauth_failed", baseUrl);
  }

  if (flow.state !== state) {
    logger.warn("Google callback state mismatch");
    return redirectToAuthError(request, flow.locale, "google_oauth_invalid_state", baseUrl);
  }

  try {
    const env = getGoogleEnv();
    const endpoints = getGoogleEndpoints();
    const idToken = await exchangeGoogleCodeForIdToken({
      tokenEndpoint: endpoints.tokenEndpoint,
      code,
      codeVerifier: flow.codeVerifier,
      redirectUri,
      clientId: env.GOOGLE_OIDC_CLIENT_ID,
      clientSecret: env.GOOGLE_OIDC_CLIENT_SECRET,
    });

    const claims = await verifyGoogleIdToken({
      idToken,
      jwksUri: endpoints.jwksUri,
      clientId: env.GOOGLE_OIDC_CLIENT_ID,
      nonce: flow.nonce,
    });

    const user = await upsertGoogleUser(claims);
    await setUserSessionCookie(user, { secure: secureCookies });

    const destination = new URL(joinUrl(baseUrl, flow.nextPath || localizeHref(normalizeLocale(flow.locale), "/app")));
    if (shouldDebugAuthLogs()) {
      logger.info("Google callback success redirect decision", getRedirectDebugMeta(request.headers, destination.toString()));
    }
    const response = NextResponse.redirect(destination);
    response.cookies.set(GOOGLE_FLOW_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookies,
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    logger.error("Google callback failed", { error });
    return redirectToAuthError(request, flow.locale, "google_oauth_failed", baseUrl);
  }
}
