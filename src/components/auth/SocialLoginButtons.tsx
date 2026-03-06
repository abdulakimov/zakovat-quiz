"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/src/i18n/client";

type SocialLoginButtonsProps = {
  showGoogle?: boolean;
  showTelegram?: boolean;
};

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.4c-.2 1.2-.8 2.2-1.7 2.9l2.8 2.2c1.6-1.5 2.5-3.8 2.5-6.4 0-.6-.1-1.2-.2-1.8H12z"
      />
      <path
        fill="#34A853"
        d="M6.8 14.3 6.2 16.4l-2 1.5C5.7 20.8 8.6 22 12 22c2.7 0 5-1 6.7-2.8l-2.8-2.2c-.8.6-2 1-3.9 1-3 0-5.5-2-6.4-4.7z"
      />
      <path
        fill="#4A90E2"
        d="M4.2 6.1C3.4 7.6 3 9.2 3 11s.4 3.4 1.2 4.9l2.6-2.1c-.2-.5-.3-1-.3-1.7s.1-1.2.3-1.7L4.2 6.1z"
      />
      <path
        fill="#FBBC05"
        d="M12 5c1.6 0 3 .6 4.1 1.6l3-3C17 1.6 14.7.5 12 .5 8.6.5 5.7 2.4 4.2 5.2l2.6 2.1C7.7 5.9 9.1 5 12 5z"
      />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M9.78 15.99 9.4 21.1c.54 0 .77-.24 1.05-.52l2.53-2.43 5.24 3.84c.96.53 1.64.25 1.9-.88l3.45-16.17.01-.01c.31-1.45-.52-2.02-1.45-1.67L1.88 11.1c-1.39.54-1.37 1.32-.24 1.67l5.2 1.63L18.92 6.9c.57-.35 1.09-.16.67.2" />
    </svg>
  );
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
      className="h-10 w-full border-border bg-card text-foreground hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      data-testid={testId}
    >
      <Link href={href} aria-label={label} className="relative flex w-full items-center justify-center">
        <span className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>
        <span>{label}</span>
      </Link>
    </Button>
  );
}

export function SocialLoginButtons({
  showGoogle = true,
  showTelegram = true,
}: SocialLoginButtonsProps) {
  const tAuth = useTranslations("auth");

  return (
    <div className="space-y-2">
      {showGoogle ? (
        <SocialButton
          href="/auth/google/start"
          label={tAuth("actions.continueWithGoogle")}
          icon={<GoogleIcon />}
          testId="google-login"
        />
      ) : null}
      {showTelegram ? (
        <SocialButton
          href="/auth/telegram/start"
          label={tAuth("actions.continueWithTelegram")}
          icon={<TelegramIcon />}
          testId="telegram-login"
        />
      ) : null}
    </div>
  );
}
