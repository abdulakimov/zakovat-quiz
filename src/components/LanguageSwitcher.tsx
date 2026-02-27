"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  getPathWithoutLocale,
  localeCookieName,
  localizeHref,
  locales,
  normalizeLocale,
  type AppLocale,
} from "@/src/i18n/config";

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

  const localeNames: Record<AppLocale, string> = {
    uz: tCommon("languageUz"),
    ru: tCommon("languageRu"),
    en: tCommon("languageEn"),
  };

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
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0"
                data-testid="lang-switcher"
                aria-label={tCommon("changeLanguage")}
              >
                <Globe className="h-4 w-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{tCommon("language")}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel>{tCommon("language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {locales.map((item) => {
          const active = item === currentLocale;
          return (
            <DropdownMenuItem
              key={item}
              data-testid={`lang-${item}`}
              onSelect={() => changeLocale(item)}
              className="justify-between"
            >
              <span>{localeNames[item]}</span>
              {active ? <Check className="h-4 w-4" aria-hidden /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
