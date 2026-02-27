"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useLocale } from "next-intl";
import { login, type AuthState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormErrorSummary } from "@/src/components/form/FormErrorSummary";
import { useTranslations } from "@/src/i18n/client";
import { localizeHref, normalizeLocale } from "@/src/i18n/config";
import { FormFieldPassword } from "@/src/components/form/FormFieldPassword";
import { FormFieldText } from "@/src/components/form/FormFieldText";
import { toast } from "@/src/components/ui/sonner";
import { loginSchema, type LoginInput } from "@/src/schemas/auth";

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

function toFormData(values: LoginInput) {
  const formData = new FormData();
  formData.set("usernameOrEmail", values.usernameOrEmail);
  formData.set("password", values.password);
  return formData;
}

export default function LoginForm() {
  const locale = normalizeLocale(useLocale());
  const tAuth = useTranslations("auth");
  const [isPending, startTransition] = React.useTransition();
  const [serverState, setServerState] = React.useState<AuthState>({});

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      usernameOrEmail: "",
      password: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setServerState({});

    startTransition(() => {
      void (async () => {
        try {
          const result = await login({}, toFormData(values));
          setServerState(result ?? {});
          if (result?.error) toast.error(result.error);
          if (result?.success) toast.success(result.success);
        } catch (error) {
          if (isRedirectError(error)) throw error;
          const message = tAuth("loginUnavailable");
          setServerState({ error: message });
          toast.error(message);
        }
      })();
    });
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 pb-3">
        <CardTitle className="text-base font-semibold" data-testid="login-heading">{tAuth("loginTitle")}</CardTitle>
        <CardDescription className="text-sm">{tAuth("loginCardDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3" noValidate>
          <FormFieldText
            id="usernameOrEmail"
            name="usernameOrEmail"
            label={tAuth("usernameOrEmail")}
            register={form.register}
            error={form.formState.errors.usernameOrEmail}
            autoComplete="username"
            disabled={isPending}
          />
          <FormFieldPassword
            id="password"
            name="password"
            label={tAuth("password")}
            register={form.register}
            error={form.formState.errors.password}
            autoComplete="current-password"
            disabled={isPending}
          />

          <FormErrorSummary
            serverError={serverState.error}
            errors={[
              form.formState.errors.usernameOrEmail?.message,
              form.formState.errors.password?.message,
            ]}
          />

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? tAuth("signingIn") : tAuth("signIn")}
          </Button>

          <p className="text-xs text-muted-foreground">
            {tAuth("needAccount")}{" "}
            <Link href={localizeHref(locale, "/auth/signup")} className="font-medium text-foreground underline">
              {tAuth("signUp")}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
