"use client";

import * as React from "react";
import { IntlErrorCode, NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";

export function IntlProvider({
  locale,
  messages,
  children,
}: {
  locale: string;
  messages: AbstractIntlMessages;
  children: React.ReactNode;
}) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      onError={(error) => {
        const messagePath = [error.namespace, error.key].filter(Boolean).join(".");
        if (error.code === IntlErrorCode.MISSING_MESSAGE) {
          const warning = `Missing translation ${messagePath}`;
          if (typeof console !== "undefined") console.warn(warning);
          return;
        }
        if (process.env.NODE_ENV === "development") {
          console.error(error);
          return;
        }
        throw error;
      }}
      getMessageFallback={({ namespace, key }) => {
        const messagePath = [namespace, key].filter(Boolean).join(".");
        const placeholder = `⟦${messagePath}⟧`;
        if (typeof console !== "undefined") {
          console.warn(`Missing translation fallback for ${messagePath}`);
        }
        return placeholder;
      }}
    >
      {children}
    </NextIntlClientProvider>
  );
}
