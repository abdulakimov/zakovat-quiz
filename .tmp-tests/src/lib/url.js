"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfiguredBaseUrl = getConfiguredBaseUrl;
exports.getCanonicalBaseUrl = getCanonicalBaseUrl;
exports.joinUrl = joinUrl;
exports.isSecureBaseUrl = isSecureBaseUrl;
exports.shouldDebugAuthLogs = shouldDebugAuthLogs;
exports.getRedirectDebugMeta = getRedirectDebugMeta;
const DEFAULT_LOCAL_ORIGIN = "http://localhost:3000";
function normalizeOrigin(value) {
    const trimmed = value.trim().replace(/\/+$/, "");
    const url = new URL(trimmed);
    return `${url.protocol}//${url.host}`;
}
function firstHeaderValue(value) {
    var _a;
    if (!value)
        return null;
    return ((_a = value.split(",")[0]) === null || _a === void 0 ? void 0 : _a.trim()) || null;
}
function toCanonicalOrigin(raw) {
    return normalizeOrigin(raw);
}
function shouldForceLocalHttp(host) {
    var _a;
    if (process.env.LOCAL_HTTPS === "true") {
        return false;
    }
    const hostname = (_a = host.toLowerCase().split(":")[0]) !== null && _a !== void 0 ? _a : "";
    return hostname === "localhost" || hostname === "127.0.0.1";
}
function getConfiguredBaseUrl() {
    var _a;
    const raw = (_a = process.env.PUBLIC_APP_URL) !== null && _a !== void 0 ? _a : process.env.APP_BASE_URL;
    if (!raw)
        return null;
    try {
        return toCanonicalOrigin(raw);
    }
    catch (_b) {
        return null;
    }
}
function getCanonicalBaseUrl(headerSource) {
    var _a, _b, _c;
    const configured = getConfiguredBaseUrl();
    if (configured) {
        return configured;
    }
    const forwardedProto = firstHeaderValue((_a = headerSource === null || headerSource === void 0 ? void 0 : headerSource.get("x-forwarded-proto")) !== null && _a !== void 0 ? _a : null);
    const forwardedHost = firstHeaderValue((_b = headerSource === null || headerSource === void 0 ? void 0 : headerSource.get("x-forwarded-host")) !== null && _b !== void 0 ? _b : null);
    const host = firstHeaderValue((_c = headerSource === null || headerSource === void 0 ? void 0 : headerSource.get("host")) !== null && _c !== void 0 ? _c : null);
    if (!host && !forwardedHost) {
        return DEFAULT_LOCAL_ORIGIN;
    }
    const resolvedHost = forwardedHost || host;
    const proto = shouldForceLocalHttp(resolvedHost) ? "http" : (forwardedProto || "http");
    return `${proto}://${resolvedHost}`;
}
function joinUrl(base, path) {
    return new URL(path, base).toString();
}
function isSecureBaseUrl(baseUrl) {
    return baseUrl.startsWith("https://");
}
function shouldDebugAuthLogs() {
    return (process.env.NODE_ENV !== "production" ||
        process.env.DEBUG_AUTH === "1" ||
        process.env.DEBUG_TELEGRAM_OIDC === "true");
}
function getRedirectDebugMeta(headerSource, target) {
    const canonicalBaseUrl = getCanonicalBaseUrl(headerSource);
    return {
        canonicalBaseUrl,
        xForwardedProto: firstHeaderValue(headerSource.get("x-forwarded-proto")),
        xForwardedHost: firstHeaderValue(headerSource.get("x-forwarded-host")),
        host: firstHeaderValue(headerSource.get("host")),
        target,
    };
}
