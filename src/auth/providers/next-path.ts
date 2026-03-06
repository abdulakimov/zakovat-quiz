import { getPathWithoutLocale, localizeHref, normalizeLocale } from "@/src/i18n/config";

const LOCAL_ORIGIN = "http://localhost";
const QR_FINISH_PATH = "/auth/qr/finish";

function parseRelativeUrl(raw: string) {
  try {
    const parsed = new URL(raw, LOCAL_ORIGIN);
    if (parsed.origin !== LOCAL_ORIGIN) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function normalizeOAuthNextPath(rawNext: string | null, locale: string) {
  const normalizedLocale = normalizeLocale(locale);
  const fallback = localizeHref(normalizedLocale, "/app");
  if (!rawNext) {
    return fallback;
  }

  const parsed = parseRelativeUrl(rawNext);
  if (!parsed) {
    return fallback;
  }

  if (parsed.pathname === QR_FINISH_PATH) {
    return `${parsed.pathname}${parsed.search}`;
  }

  const pathWithoutLocale = getPathWithoutLocale(parsed.pathname);
  if (!pathWithoutLocale.startsWith("/app")) {
    return fallback;
  }

  return `${localizeHref(normalizedLocale, pathWithoutLocale)}${parsed.search}`;
}
