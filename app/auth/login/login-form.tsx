"use client";

import * as React from "react";
import Link from "next/link";
import { type FieldError, type FieldErrors, useForm } from "react-hook-form";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { login, type AuthState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FormErrorSummary } from "@/src/components/form/FormErrorSummary";
import { FormFieldPassword } from "@/src/components/form/FormFieldPassword";
import { FormFieldText } from "@/src/components/form/FormFieldText";
import { SocialLoginButtons } from "@/src/components/auth/SocialLoginButtons";
import { toast } from "@/src/components/ui/sonner";
import { useTranslations } from "@/src/i18n/client";
import { localizeHref, normalizeLocale } from "@/src/i18n/config";
import { zodResolverCompat } from "@/src/validators/rhf-zod";
import { signInSchema, type SignInInput } from "@/src/validators/auth";

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

function toFormData(values: SignInInput, nextPath: string | null) {
  const formData = new FormData();
  formData.set("usernameOrEmail", values.usernameOrEmail);
  formData.set("password", values.password);
  if (nextPath) {
    formData.set("next", nextPath);
  }
  return formData;
}

export default function LoginForm() {
  const locale = normalizeLocale(useLocale());
  const searchParams = useSearchParams();
  const t = useTranslations();
  const tAuth = useTranslations("auth");
  const nextPath = searchParams.get("next");
  const oauthError = searchParams.get("error");
  const [isPending, startTransition] = React.useTransition();
  const [serverState, setServerState] = React.useState<AuthState>({});
  const oauthErrorMessage =
    oauthError === "telegram_oauth_invalid_state"
      ? tAuth("telegramStateInvalid")
      : oauthError === "telegram_oauth_failed"
        ? tAuth("telegramLoginFailed")
        : oauthError === "google_oauth_invalid_state"
          ? tAuth("googleStateInvalid")
          : oauthError === "google_oauth_failed"
            ? tAuth("googleLoginFailed")
        : undefined;

  const form = useForm<SignInInput>({
    resolver: zodResolverCompat(signInSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      usernameOrEmail: "",
      password: "",
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
        if (field !== "usernameOrEmail" && field !== "password") {
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

  const onValidSubmit = React.useCallback(
    (values: SignInInput) => {
      setServerState({});

      startTransition(() => {
        void (async () => {
          try {
            const result = await login({}, toFormData(values, nextPath));
            setServerState(result ?? {});

            if (result && result.ok === false) {
              applyServerErrors(result);
              if (result.formErrorKey) {
                toast.error(translateKey(result.formErrorKey) ?? tAuth("loginUnavailable"));
              }
            }
          } catch (error) {
            if (isRedirectError(error)) throw error;
            const message = tAuth("loginUnavailable");
            setServerState({ formErrorKey: "auth.loginUnavailable" });
            toast.error(message);
          }
        })();
      });
    },
    [applyServerErrors, nextPath, tAuth, translateKey],
  );

  const onInvalidSubmit = React.useCallback((_errors: FieldErrors<SignInInput>) => {
    setServerState({});
  }, []);

  const onSubmit = form.handleSubmit(onValidSubmit, onInvalidSubmit);

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <h2 className="sr-only" data-testid="login-heading">{tAuth("login.title")}</h2>
      <SocialLoginButtons nextPath={nextPath} />
      <p className="text-center text-xs text-muted-foreground">{tAuth("misc.termsNotice")}</p>

      <div className="relative py-1">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
          {tAuth("misc.continueWithEmail")}
        </span>
      </div>

      <FormFieldText
        id="usernameOrEmail"
        name="usernameOrEmail"
        label={tAuth("fields.identifier")}
        register={form.register}
        error={toFieldError(form.formState.errors.usernameOrEmail)}
        autoComplete="username"
        disabled={isPending}
      />
      <FormFieldPassword
        id="password"
        name="password"
        label={tAuth("fields.password")}
        register={form.register}
        error={toFieldError(form.formState.errors.password)}
        autoComplete="current-password"
        disabled={isPending}
      />

      <FormErrorSummary
        serverError={translateKey(serverState.formErrorKey) ?? oauthErrorMessage}
        errors={[
          toFieldError(form.formState.errors.usernameOrEmail)?.message,
          toFieldError(form.formState.errors.password)?.message,
        ]}
      />

      <Button type="submit" className="h-10 w-full" disabled={isPending} data-testid="login-submit">
        {isPending ? tAuth("signingIn") : tAuth("actions.login")}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        {tAuth("misc.noAccount")}{" "}
        <Link href={localizeHref(locale, "/auth/signup")} className="font-medium text-foreground underline">
          {tAuth("actions.signup")}
        </Link>
      </p>

      <p className="text-center text-xs text-muted-foreground md:hidden">
        <Link
          href={localizeHref(locale, "/auth/qr")}
          className="font-medium text-foreground underline"
          data-testid="mobile-qr-entry-link"
        >
          {tAuth("qr.mobile.entryLink")}
        </Link>
      </p>
    </form>
  );
}
