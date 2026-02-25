import LoginForm from "@/app/auth/login/login-form";
import { AuthLayout } from "@/src/components/layout/AuthLayout";

export default function LoginPage() {
  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to manage quizzes, assets, and workspace settings."
    >
      <LoginForm />
    </AuthLayout>
  );
}
