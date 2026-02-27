import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { cn } from "@/lib/utils";
import { fontSans } from "@/src/lib/fonts";
import { Toaster } from "@/src/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zakovat Quiz Creator",
  description: "Quiz authoring workspace",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

  return (
    <html lang={locale}>
      <body
        className={cn(fontSans.variable, "font-sans bg-slate-50 text-slate-900 antialiased")}
        suppressHydrationWarning
      >
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
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast: "shadow-lg",
            },
          }}
        />
      </body>
    </html>
  );
}
