"use client";

import { Button } from "@/components/ui/button";
import { useTranslations } from "@/src/i18n/client";

function TelegramIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="currentColor"
    >
      <path d="M9.78 15.99 9.4 21.1c.54 0 .77-.24 1.05-.52l2.53-2.43 5.24 3.84c.96.53 1.64.25 1.9-.88l3.45-16.17.01-.01c.31-1.45-.52-2.02-1.45-1.67L1.88 11.1c-1.39.54-1.37 1.32-.24 1.67l5.2 1.63L18.92 6.9c.57-.35 1.09-.16.67.2" />
    </svg>
  );
}

export function TelegramLoginButton() {
  const tAuth = useTranslations("auth");

  return (
    <Button asChild variant="outline" className="w-full">
      <a
        href="/auth/telegram/start"
        aria-label={tAuth("continueWithTelegram")}
        data-testid="telegram-login-button"
      >
        <TelegramIcon />
        {tAuth("continueWithTelegram")}
      </a>
    </Button>
  );
}
