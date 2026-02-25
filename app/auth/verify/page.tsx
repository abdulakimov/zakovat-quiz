import VerifyForm from "@/app/auth/verify/verify-form";
import { AuthLayout } from "@/src/components/layout/AuthLayout";

export default function VerifyPage() {
  return (
    <AuthLayout
      title="Verify your email"
      description="Confirm your account with the code sent to your inbox."
    >
      <VerifyForm />
    </AuthLayout>
  );
}
