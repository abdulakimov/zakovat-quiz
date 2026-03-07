"use client";

import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/src/components/icons/GoogleIcon";
import { TelegramIcon } from "@/src/components/icons/TelegramIcon";
import { useTranslations } from "@/src/i18n/client";

type ProviderLoginPanelProps = {
  nextPath?: string | null;
  info?: string | null;
};

function withNext(path: string, nextPath?: string | null) {
  if (!nextPath) {
    return path;
  }

  return `${path}?next=${encodeURIComponent(nextPath)}`;
}

export function ProviderLoginPanel({ nextPath, info }: ProviderLoginPanelProps) {
  const tAuth = useTranslations("auth");

  return (
    <div className="space-y-4 pt-0">
      <header className="mx-auto flex min-h-[88px] flex-col justify-start space-y-1.5 text-center" data-testid="left-header">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">{tAuth("login.title")}</h1>
        <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground">{tAuth("login.subtitle")}</p>
      </header>

      {info === "signup_disabled" ? (
        <p
          className="rounded-xl border border-border bg-background/50 px-3 py-2 text-sm text-foreground"
          data-testid="signup-disabled-info"
        >
          {tAuth("info.signupDisabled")}
        </p>
      ) : null}

      <div className="mx-auto mt-10 max-w-sm space-y-4">
        <div data-testid="provider-telegram">
          <Button
            asChild
            variant="outline"
            className="h-12 w-full rounded-xl border-border/70 bg-background/70 text-foreground shadow-sm transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <a
              href={withNext("/auth/telegram/start", nextPath)}
              aria-label={tAuth("actions.continueWithTelegram")}
              data-testid="telegram-login"
              className="relative flex w-full items-center justify-center"
            >
              <span className="absolute left-4 top-1/2 -translate-y-1/2">
                <TelegramIcon className="h-5 w-5" />
              </span>
              <span className="text-sm font-medium">{tAuth("actions.continueWithTelegram")}</span>
            </a>
          </Button>
        </div>

        <div data-testid="provider-google">
          <Button
            asChild
            variant="outline"
            className="h-12 w-full rounded-xl border-border/70 bg-background/70 text-foreground shadow-sm transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <a
              href={withNext("/auth/google/start", nextPath)}
              aria-label={tAuth("actions.continueWithGoogle")}
              data-testid="google-login"
              className="relative flex w-full items-center justify-center"
            >
              <span className="absolute left-4 top-1/2 -translate-y-1/2">
                <GoogleIcon className="h-5 w-5" />
              </span>
              <span className="text-sm font-medium">{tAuth("actions.continueWithGoogle")}</span>
            </a>
          </Button>
        </div>
      </div>

      <p className="mx-auto mt-8 max-w-sm text-center text-xs text-muted-foreground">{tAuth("login.termsShort")}</p>
    </div>
  );
}
