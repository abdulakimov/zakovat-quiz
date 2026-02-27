"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useLocale } from "next-intl";
import { signup, type AuthState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormErrorSummary } from "@/src/components/form/FormErrorSummary";
import { useTranslations } from "@/src/i18n/client";
import { localizeHref, normalizeLocale } from "@/src/i18n/config";
import { FormFieldPassword } from "@/src/components/form/FormFieldPassword";
import { FormFieldText } from "@/src/components/form/FormFieldText";
import { toast } from "@/src/components/ui/sonner";
import { signupSchema, type SignupInput } from "@/src/schemas/auth";

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

function toFormData(values: SignupInput) {
  const formData = new FormData();
  formData.set("name", values.name ?? "");
  formData.set("username", values.username);
  formData.set("email", values.email);
  formData.set("password", values.password);
  return formData;
}

export default function SignupForm() {
  const locale = normalizeLocale(useLocale());
  const tAuth = useTranslations("auth");
  const [isPending, startTransition] = React.useTransition();
  const [serverState, setServerState] = React.useState<AuthState>({});

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setServerState({});

    startTransition(() => {
      void (async () => {
        try {
          const result = await signup({}, toFormData(values));
          setServerState(result ?? {});
          if (result?.error) toast.error(result.error);
          if (result?.success) toast.success(result.success);
        } catch (error) {
          if (isRedirectError(error)) throw error;
          const message = tAuth("signupUnavailable");
          setServerState({ error: message });
          toast.error(message);
        }
      })();
    });
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 pb-3">
        <CardTitle className="text-base font-semibold" data-testid="signup-heading">{tAuth("signupTitle")}</CardTitle>
        <CardDescription className="text-sm">{tAuth("signupCardDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3" noValidate>
          <FormFieldText
            id="name"
            name="name"
            label={tAuth("name")}
            register={form.register}
            error={form.formState.errors.name}
            autoComplete="name"
            disabled={isPending}
          />
          <FormFieldText
            id="username"
            name="username"
            label={tAuth("username")}
            register={form.register}
            error={form.formState.errors.username}
            autoComplete="username"
            disabled={isPending}
          />
          <FormFieldText
            id="email"
            name="email"
            label={tAuth("email")}
            type="email"
            register={form.register}
            error={form.formState.errors.email}
            autoComplete="email"
            disabled={isPending}
          />
          <FormFieldPassword
            id="password"
            name="password"
            label={tAuth("password")}
            register={form.register}
            error={form.formState.errors.password}
            autoComplete="new-password"
            disabled={isPending}
          />

          <FormErrorSummary
            serverError={serverState.error}
            errors={[
              form.formState.errors.name?.message,
              form.formState.errors.username?.message,
              form.formState.errors.email?.message,
              form.formState.errors.password?.message,
            ]}
          />

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? tAuth("creatingAccount") : tAuth("createAccount")}
          </Button>

          <p className="text-xs text-muted-foreground">
            {tAuth("alreadyAccount")}{" "}
            <Link href={localizeHref(locale, "/auth/login")} className="font-medium text-foreground underline">
              {tAuth("signIn")}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
