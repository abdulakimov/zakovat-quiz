"use client";

import { useSearchParams } from "next/navigation";
import { ProviderLoginPanel } from "@/src/components/auth/ProviderLoginPanel";
import { useTranslations } from "@/src/i18n/client";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const tAuth = useTranslations("auth");
  const nextPath = searchParams.get("next");
  const info = searchParams.get("info");

  return (
    <section>
      <h2 className="sr-only" data-testid="login-heading">
        {tAuth("login.title")}
      </h2>
      <ProviderLoginPanel nextPath={nextPath} info={info} />
    </section>
  );
}
