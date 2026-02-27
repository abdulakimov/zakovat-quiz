"use client";

import * as React from "react";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";

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
        if (process.env.NODE_ENV === "development") {
          console.error(error);
          return;
        }
        throw error;
      }}
      getMessageFallback={({ namespace, key }) => {
        const messagePath = [namespace, key].filter(Boolean).join(".");
        if (process.env.NODE_ENV === "development") {
          return messagePath;
        }
        throw new Error(`Missing translation key: ${messagePath}`);
      }}
    >
      {children}
    </NextIntlClientProvider>
  );
}
