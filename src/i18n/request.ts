import { cookies, headers } from "next/headers";
import { getRequestConfig, IntlErrorCode } from "next-intl/server";
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
    onError(error) {
      const messagePath = [error.namespace, error.key].filter(Boolean).join(".");
      if (error.code === IntlErrorCode.MISSING_MESSAGE) {
        const warning = `[i18n] Missing message: ${error.locale ?? locale} ${messagePath}`;
        if (process.env.NODE_ENV === "development") {
          console.warn(warning, error.stack ?? error);
        } else {
          console.warn(warning);
        }
        if (process.env.NEXT_PUBLIC_I18N_STRICT === "true") {
          throw error;
        }
        return;
      }
      throw error;
    },
    getMessageFallback({ namespace, key }) {
      return namespace ? `⟦${namespace}.${key}⟧` : `⟦${key}⟧`;
    },
  };
});
