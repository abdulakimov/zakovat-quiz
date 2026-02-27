import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { fontSans } from "@/src/lib/fonts";
import { Toaster } from "@/src/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zakovat Quiz Creator",
  description: "Quiz authoring workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(fontSans.variable, "font-sans bg-slate-50 text-slate-900 antialiased")}
        suppressHydrationWarning
      >
        {children}
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
