import Link from "next/link";
import { Suspense } from "react";
import VerifyForm from "@/app/auth/verify/verify-form";
import { AuthLayout } from "@/src/components/layout/AuthLayout";
import { getAuthEnv } from "@/src/env";

export default function VerifyPage() {
  const emailVerificationEnabled = getAuthEnv().EMAIL_VERIFICATION_ENABLED;

  if (!emailVerificationEnabled) {
    return (
      <AuthLayout
        title="Verification is disabled"
        description="Email verification is turned off for this environment."
      >
        <div className="space-y-3 text-sm text-slate-600">
          <p>You can continue to your workspace without verifying your email.</p>
          <Link href="/auth/login" className="font-medium text-slate-900 underline">
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Verify your email"
      description="Confirm your account with the code sent to your inbox."
    >
      <Suspense
        fallback={<div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading…</div>}
      >
        <VerifyForm />
      </Suspense>
    </AuthLayout>
  );
}
