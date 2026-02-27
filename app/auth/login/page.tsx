import { getTranslations } from "@/src/i18n/server";
import LoginForm from "@/app/auth/login/login-form";
import { AuthLayout } from "@/src/components/layout/AuthLayout";

export default async function LoginPage() {
  const tAuth = await getTranslations("auth");

  return (
    <AuthLayout
      title={tAuth("loginTitle")}
      description={tAuth("loginDescription")}
    >
      <LoginForm />
    </AuthLayout>
  );
}
