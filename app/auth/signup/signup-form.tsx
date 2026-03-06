"use client";

import * as React from "react";
import Link from "next/link";
import { type FieldError, useForm } from "react-hook-form";
import { useLocale } from "next-intl";
import { signup, type AuthState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FormErrorSummary } from "@/src/components/form/FormErrorSummary";
import { useTranslations } from "@/src/i18n/client";
import { localizeHref, normalizeLocale } from "@/src/i18n/config";
import { FormFieldPassword } from "@/src/components/form/FormFieldPassword";
import { FormFieldText } from "@/src/components/form/FormFieldText";
import { toast } from "@/src/components/ui/sonner";
import { SocialLoginButtons } from "@/src/components/auth/SocialLoginButtons";
import { zodResolverCompat } from "@/src/validators/rhf-zod";
import { signUpSchema, type SignUpInput } from "@/src/validators/auth";

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

function toFormData(values: SignUpInput) {
  const formData = new FormData();
  formData.set("name", values.name ?? "");
  formData.set("username", values.username);
  formData.set("email", values.email);
  formData.set("password", values.password);
  formData.set("confirmPassword", values.confirmPassword);
  return formData;
}

export default function SignupForm() {
  const locale = normalizeLocale(useLocale());
  const t = useTranslations();
  const tAuth = useTranslations("auth");
  const [isPending, startTransition] = React.useTransition();
  const [serverState, setServerState] = React.useState<AuthState>({});

  const form = useForm<SignUpInput>({
    resolver: zodResolverCompat(signUpSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const translateKey = React.useCallback(
    (key: string | undefined | null) => {
      if (!key) return undefined;
      return t(key as never);
    },
    [t],
  );

  const toFieldError = React.useCallback(
    (error: FieldError | undefined) => {
      if (!error) return undefined;
      if (!error.message) return error;

      return {
        ...error,
        message: translateKey(String(error.message)) ?? String(error.message),
      };
    },
    [translateKey],
  );

  const applyServerErrors = React.useCallback(
    (state: AuthState) => {
      for (const [field, key] of Object.entries(state.fieldErrors ?? {})) {
        if (
          field !== "name" &&
          field !== "username" &&
          field !== "email" &&
          field !== "password" &&
          field !== "confirmPassword"
        ) {
          continue;
        }

        form.setError(field, {
          type: "server",
          message: translateKey(key),
        });
      }
    },
    [form, translateKey],
  );

  const onSubmit = form.handleSubmit((values) => {
    setServerState({});

    startTransition(() => {
      void (async () => {
        try {
          const result = await signup({}, toFormData(values));
          setServerState(result ?? {});

          if (result && result.ok === false) {
            applyServerErrors(result);
            if (result.formErrorKey) {
              toast.error(translateKey(result.formErrorKey) ?? tAuth("signupUnavailable"));
            }
          }
        } catch (error) {
          if (isRedirectError(error)) throw error;
          const message = tAuth("signupUnavailable");
          setServerState({ formErrorKey: "auth.signupUnavailable" });
          toast.error(message);
        }
      })();
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <h1 className="sr-only" data-testid="signup-heading">
        {tAuth("signup.title")}
      </h1>
      <FormFieldText
        id="name"
        name="name"
        label={tAuth("fields.name")}
        register={form.register}
        error={toFieldError(form.formState.errors.name)}
        autoComplete="name"
        disabled={isPending}
      />
      <FormFieldText
        id="username"
        name="username"
        label={tAuth("fields.username")}
        register={form.register}
        error={toFieldError(form.formState.errors.username)}
        autoComplete="username"
        disabled={isPending}
      />
      <FormFieldText
        id="email"
        name="email"
        label={tAuth("fields.email")}
        type="email"
        register={form.register}
        error={toFieldError(form.formState.errors.email)}
        autoComplete="email"
        disabled={isPending}
      />
      <FormFieldPassword
        id="password"
        name="password"
        label={tAuth("fields.password")}
        register={form.register}
        error={toFieldError(form.formState.errors.password)}
        autoComplete="new-password"
        disabled={isPending}
      />
      <FormFieldPassword
        id="confirmPassword"
        name="confirmPassword"
        label={tAuth("fields.confirmPassword")}
        register={form.register}
        error={toFieldError(form.formState.errors.confirmPassword)}
        autoComplete="new-password"
        disabled={isPending}
      />

      <FormErrorSummary
        serverError={translateKey(serverState.formErrorKey)}
        errors={[
          toFieldError(form.formState.errors.name)?.message,
          toFieldError(form.formState.errors.username)?.message,
          toFieldError(form.formState.errors.email)?.message,
          toFieldError(form.formState.errors.password)?.message,
          toFieldError(form.formState.errors.confirmPassword)?.message,
        ]}
      />

      <Button type="submit" className="h-10 w-full" disabled={isPending} data-testid="signup-submit">
        {isPending ? tAuth("creatingAccount") : tAuth("actions.signup")}
      </Button>

      <div className="relative py-1">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
          {tAuth("misc.or")}
        </span>
      </div>

      <SocialLoginButtons />

      <p className="text-center text-xs text-muted-foreground">
        {tAuth("misc.haveAccount")}{" "}
        <Link href={localizeHref(locale, "/auth/login")} className="font-medium text-foreground underline">
          {tAuth("actions.login")}
        </Link>
      </p>
    </form>
  );
}
