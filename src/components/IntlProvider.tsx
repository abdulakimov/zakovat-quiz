"use client";

import * as React from "react";
import { IntlErrorCode, NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";

type IntlErrorDetails = {
  code?: string;
  namespace?: string;
  key?: string;
  locale?: string;
  stack?: string;
};

export function IntlProvider({
  locale,
  messages,
  timeZone,
  children,
}: {
  locale: string;
  messages: AbstractIntlMessages;
  timeZone: string;
  children: React.ReactNode;
}) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone={timeZone}
      onError={(error) => {
        const details = error as IntlErrorDetails;
        const messagePath = [details.namespace, details.key].filter(Boolean).join(".");
        const isMissingMessage = details.code === IntlErrorCode.MISSING_MESSAGE;
        if (isMissingMessage) {
          const warning = `[i18n] Missing message: ${details.locale ?? locale} ${messagePath}`;
          if (typeof console !== "undefined") {
            if (process.env.NODE_ENV === "development") {
              console.warn(warning, details.stack ?? error);
            } else {
              console.warn(warning);
            }
          }
          if (process.env.NEXT_PUBLIC_I18N_STRICT === "true") {
            throw error;
          }
          return;
        }
        if (process.env.NODE_ENV === "development") {
          const detailsMessage = error instanceof Error ? error.message : String(error);
          const warning = `[i18n] Non-fatal intl error: ${messagePath || "unknown"} ${detailsMessage}`;
          console.warn(warning);
          return;
        }
        throw error;
      }}
      getMessageFallback={({ namespace, key }) => {
        const messagePath = [namespace, key].filter(Boolean).join(".");
        const placeholder = namespace ? `⟦${namespace}.${key}⟧` : `⟦${key}⟧`;
        if (typeof console !== "undefined") {
          const warning = `[i18n] Missing message: ${locale} ${messagePath}`;
          if (process.env.NODE_ENV === "development") {
            console.warn(warning, { namespace, key });
          } else {
            console.warn(warning);
          }
        }
        return placeholder;
      }}
    >
      {children}
    </NextIntlClientProvider>
  );
}
