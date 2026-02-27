import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isAppLocale, localeCookieName } from "@/src/i18n/config";

export default getRequestConfig(async () => {
  const headerStore = await headers();
  const cookieStore = await cookies();

  const headerLocale = headerStore.get("x-locale");
  const cookieLocale = cookieStore.get(localeCookieName)?.value;
  const locale = isAppLocale(headerLocale) ? headerLocale : isAppLocale(cookieLocale) ? cookieLocale : defaultLocale;

  const messages = (await import(`../../messages/${locale}.json`)).default;

  return {
    locale,
    messages,
  };
});
