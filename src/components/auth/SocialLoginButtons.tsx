"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/src/i18n/client";
import { GoogleIcon } from "@/src/components/icons/GoogleIcon";
import { TelegramIcon } from "@/src/components/icons/TelegramIcon";

type SocialLoginButtonsProps = {
  showGoogle?: boolean;
  showTelegram?: boolean;
  nextPath?: string | null;
};

function withNext(path: string, nextPath?: string | null) {
  if (!nextPath) {
    return path;
  }

  const encoded = encodeURIComponent(nextPath);
  return `${path}?next=${encoded}`;
}

function SocialButton({
  href,
  label,
  icon,
  testId,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  testId: string;
}) {
  return (
    <Button
      asChild
      variant="outline"
      className="h-12 w-full rounded-xl border-border bg-card text-foreground shadow-sm transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <a href={href} aria-label={label} data-testid={testId} className="relative flex w-full items-center justify-center">
        <span className="absolute left-4 top-1/2 -translate-y-1/2">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </a>
    </Button>
  );
}

export function SocialLoginButtons({
  showGoogle = true,
  showTelegram = true,
  nextPath,
}: SocialLoginButtonsProps) {
  const tAuth = useTranslations("auth");

  return (
    <div className="space-y-2">
      {showTelegram ? (
        <SocialButton
          href={withNext("/auth/telegram/start", nextPath)}
          label={tAuth("actions.continueWithTelegram")}
          icon={<TelegramIcon />}
          testId="telegram-login"
        />
      ) : null}
      {showGoogle ? (
        <SocialButton
          href={withNext("/auth/google/start", nextPath)}
          label={tAuth("actions.continueWithGoogle")}
          icon={<GoogleIcon />}
          testId="google-login"
        />
      ) : null}
    </div>
  );
}
