import SignupForm from "@/app/auth/signup/signup-form";
import { AuthLayout } from "@/src/components/layout/AuthLayout";

export default function SignupPage() {
  return (
    <AuthLayout
      title="Create your account"
      description="Set up your workspace and start building quizzes in minutes."
    >
      <SignupForm />
    </AuthLayout>
  );
}
