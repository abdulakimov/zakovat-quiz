"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { login, type AuthState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormErrorSummary } from "@/src/components/form/FormErrorSummary";
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
          const message = "Unable to sign in right now.";
          setServerState({ error: message });
          toast.error(message);
        }
      })();
    });
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 pb-3">
        <CardTitle className="text-base font-semibold">Welcome back</CardTitle>
        <CardDescription className="text-sm">Sign in to continue.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3" noValidate>
          <FormFieldText
            id="usernameOrEmail"
            name="usernameOrEmail"
            label="Username or email"
            register={form.register}
            error={form.formState.errors.usernameOrEmail}
            autoComplete="username"
            disabled={isPending}
          />
          <FormFieldPassword
            id="password"
            name="password"
            label="Password"
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
            {isPending ? "Signing in..." : "Sign in"}
          </Button>

          <p className="text-xs text-slate-500">
            Need an account?{" "}
            <Link href="/auth/signup" className="font-medium text-slate-900 underline">
              Sign up
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
