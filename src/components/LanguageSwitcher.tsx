"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getPathWithoutLocale,
  localeCookieName,
  localizeHref,
  locales,
  normalizeLocale,
  type AppLocale,
} from "@/src/i18n/config";

const localeLabels: Record<AppLocale, string> = {
  uz: "UZ",
  ru: "RU",
  en: "EN",
};

function buildLocalizedPath(pathname: string, locale: AppLocale) {
  const normalized = getPathWithoutLocale(pathname);
  return localizeHref(locale, normalized);
}

export function LanguageSwitcher() {
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const currentLocale = normalizeLocale(locale);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  function changeLocale(nextLocale: AppLocale) {
    if (!pathname || nextLocale === currentLocale) {
      return;
    }

    const nextPathname = buildLocalizedPath(pathname, nextLocale);
    const query = searchParams.toString();
    const href = query ? `${nextPathname}?${query}` : nextPathname;
    document.cookie = `${localeCookieName}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    router.push(href);
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 min-w-16"
          data-testid="lang-switcher"
          aria-label={tCommon("language")}
        >
          {localeLabels[currentLocale]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-32">
        <DropdownMenuLabel>{tCommon("language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {locales.map((item) => (
          <DropdownMenuItem
            key={item}
            data-testid={`lang-${item}`}
            onSelect={() => changeLocale(item)}
            className="justify-between"
          >
            <span>{localeLabels[item]}</span>
            {item === currentLocale ? <span aria-hidden="true">•</span> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
