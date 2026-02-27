export const locales = ["uz", "ru", "en"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "uz";
export const localeCookieName = "NEXT_LOCALE";

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export function normalizeLocale(value: string | null | undefined): AppLocale {
  return isAppLocale(value) ? value : defaultLocale;
}

export function localizeHref(locale: AppLocale, href: string): string {
  if (!href.startsWith("/")) {
    return href;
  }

  if (href === "/") {
    return `/${locale}`;
  }

  return `/${locale}${href}`;
}

export function getPathWithoutLocale(pathname: string): string {
  const parts = pathname.split("/");
  const segment = parts[1];
  if (!isAppLocale(segment)) {
    return pathname;
  }

  const nextPath = `/${parts.slice(2).join("/")}`;
  return nextPath === "/" ? "/" : nextPath.replace(/\/+$/, "") || "/";
}
