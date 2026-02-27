import type { Metadata } from "next";
import { getLocale, getMessages } from "next-intl/server";
import { cn } from "@/lib/utils";
import { IntlProvider } from "@/src/components/IntlProvider";
import { ThemeProvider } from "@/src/components/theme/ThemeProvider";
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
    <html lang={locale} suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={cn(fontSans.variable, "bg-background text-foreground font-sans antialiased")}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <IntlProvider locale={locale} messages={messages}>
            {children}
          </IntlProvider>
        </ThemeProvider>
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
