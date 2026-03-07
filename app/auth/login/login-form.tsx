"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { SocialLoginButtons } from "@/src/components/auth/SocialLoginButtons";
import { useTranslations } from "@/src/i18n/client";
import { localizeHref, normalizeLocale } from "@/src/i18n/config";

export default function LoginForm() {
  const locale = normalizeLocale(useLocale());
  const searchParams = useSearchParams();
  const tAuth = useTranslations("auth");
  const nextPath = searchParams.get("next");
  const info = searchParams.get("info");

  return (
    <section className="space-y-4">
      <h2 className="sr-only" data-testid="login-heading">
        {tAuth("login.title")}
      </h2>

      {info === "signup_disabled" ? (
        <p className="rounded-xl border border-border bg-background/50 px-3 py-2 text-sm text-foreground" data-testid="signup-disabled-info">
          {tAuth("info.signupDisabled")}
        </p>
      ) : null}

      <SocialLoginButtons nextPath={nextPath} />
      <p className="text-center text-xs text-muted-foreground">{tAuth("misc.termsNotice")}</p>

      <p className="text-center text-xs text-muted-foreground md:hidden">
        <Link
          href={localizeHref(locale, "/auth/qr")}
          className="font-medium text-foreground underline"
          data-testid="mobile-qr-entry-link"
        >
          {tAuth("qr.mobile.entryLink")}
        </Link>
      </p>
    </section>
  );
}
