type HeaderSource = Pick<Headers, "get">;

const DEFAULT_LOCAL_ORIGIN = "http://localhost:3000";

function normalizeOrigin(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  const url = new URL(trimmed);
  return `${url.protocol}//${url.host}`;
}

function firstHeaderValue(value: string | null) {
  if (!value) return null;
  return value.split(",")[0]?.trim() || null;
}

function toCanonicalOrigin(raw: string) {
  return normalizeOrigin(raw);
}

function shouldForceLocalHttp(host: string) {
  if (process.env.LOCAL_HTTPS === "true") {
    return false;
  }

  const hostname = host.toLowerCase().split(":")[0] ?? "";
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function getConfiguredBaseUrl() {
  const raw = process.env.PUBLIC_APP_URL ?? process.env.APP_BASE_URL;
  if (!raw) return null;

  try {
    return toCanonicalOrigin(raw);
  } catch {
    return null;
  }
}

export function getCanonicalBaseUrl(headerSource?: HeaderSource) {
  const configured = getConfiguredBaseUrl();
  if (configured) {
    return configured;
  }

  const forwardedProto = firstHeaderValue(headerSource?.get("x-forwarded-proto") ?? null);
  const forwardedHost = firstHeaderValue(headerSource?.get("x-forwarded-host") ?? null);
  const host = firstHeaderValue(headerSource?.get("host") ?? null);

  if (!host && !forwardedHost) {
    return DEFAULT_LOCAL_ORIGIN;
  }

  const resolvedHost = forwardedHost || host!;
  const proto = shouldForceLocalHttp(resolvedHost) ? "http" : (forwardedProto || "http");
  return `${proto}://${resolvedHost}`;
}

export function joinUrl(base: string, path: string) {
  return new URL(path, base).toString();
}

export function isSecureBaseUrl(baseUrl: string) {
  return baseUrl.startsWith("https://");
}

export function shouldDebugAuthLogs() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.DEBUG_AUTH === "1" ||
    process.env.DEBUG_TELEGRAM_OIDC === "true"
  );
}

export function getRedirectDebugMeta(headerSource: HeaderSource, target: string) {
  const canonicalBaseUrl = getCanonicalBaseUrl(headerSource);
  return {
    canonicalBaseUrl,
    xForwardedProto: firstHeaderValue(headerSource.get("x-forwarded-proto")),
    xForwardedHost: firstHeaderValue(headerSource.get("x-forwarded-host")),
    host: firstHeaderValue(headerSource.get("host")),
    target,
  };
}
