"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useSearchParams } from "next/navigation";
import { resendVerification, verifyEmail, type AuthState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormErrorSummary } from "@/src/components/form/FormErrorSummary";
import { FormFieldText } from "@/src/components/form/FormFieldText";
import { toast } from "@/src/components/ui/sonner";
import {
  resendVerificationSchema,
  verifySchema,
  type ResendVerificationInput,
  type VerifyInput,
} from "@/src/schemas/auth";

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

function toVerifyFormData(values: VerifyInput) {
  const formData = new FormData();
  formData.set("email", values.email);
  formData.set("code", values.code);
  return formData;
}

function toResendFormData(values: ResendVerificationInput) {
  const formData = new FormData();
  formData.set("email", values.email);
  return formData;
}

export default function VerifyForm() {
  const params = useSearchParams();
  const emailFromQuery = params.get("email") ?? "";

  const [verifyPending, startVerifyTransition] = React.useTransition();
  const [resendPending, startResendTransition] = React.useTransition();
  const [verifyState, setVerifyState] = React.useState<AuthState>({});
  const [resendState, setResendState] = React.useState<AuthState>({});

  const form = useForm<VerifyInput>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      email: emailFromQuery,
      code: "",
    },
  });

  React.useEffect(() => {
    form.reset({
      email: emailFromQuery,
      code: form.getValues("code"),
    });
  }, [emailFromQuery, form]);

  const onVerifySubmit = form.handleSubmit((values) => {
    setVerifyState({});

    startVerifyTransition(() => {
      void (async () => {
        try {
          const result = await verifyEmail({}, toVerifyFormData(values));
          setVerifyState(result ?? {});
          if (result?.error) toast.error(result.error);
          if (result?.success) toast.success(result.success);
        } catch (error) {
          if (isRedirectError(error)) throw error;
          const message = "Unable to verify email right now.";
          setVerifyState({ error: message });
          toast.error(message);
        }
      })();
    });
  });

  const onResend = () => {
    setResendState({});
    const email = form.getValues("email");
    const parsed = resendVerificationSchema.safeParse({ email });

    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message ?? "Email is required.";
      form.setError("email", { message: issue });
      toast.error(issue);
      return;
    }

    startResendTransition(() => {
      void (async () => {
        try {
          const result = await resendVerification({}, toResendFormData(parsed.data));
          setResendState(result ?? {});
          if (result?.error) toast.error(result.error);
          if (result?.success) toast.success(result.success);
        } catch (error) {
          if (isRedirectError(error)) throw error;
          const message = "Unable to resend code right now.";
          setResendState({ error: message });
          toast.error(message);
        }
      })();
    });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 pb-3">
        <CardTitle className="text-base font-semibold">Verify your email</CardTitle>
        <CardDescription className="text-sm">Enter the 6-digit code we sent.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onVerifySubmit} className="space-y-3" noValidate>
          <FormFieldText
            id="email"
            name="email"
            label="Email"
            type="email"
            register={form.register}
            error={form.formState.errors.email}
            disabled={verifyPending || resendPending}
          />
          <FormFieldText
            id="code"
            name="code"
            label="Verification code"
            register={form.register}
            error={form.formState.errors.code}
            inputMode="numeric"
            autoComplete="one-time-code"
            disabled={verifyPending || resendPending}
          />

          <FormErrorSummary
            serverError={verifyState.error}
            errors={[form.formState.errors.email?.message, form.formState.errors.code?.message]}
          />

          {verifyState.success ? <p className="text-xs text-green-700">{verifyState.success}</p> : null}

          <Button type="submit" className="w-full" disabled={verifyPending || resendPending}>
            {verifyPending ? "Verifying..." : "Verify"}
          </Button>
        </form>

        <div className="border-t border-slate-200 pt-4">
          <FormErrorSummary serverError={resendState.error} />
          {resendState.success ? <p className="mb-2 text-xs text-green-700">{resendState.success}</p> : null}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onResend}
            disabled={verifyPending || resendPending}
          >
            {resendPending ? "Resending..." : "Resend code"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
