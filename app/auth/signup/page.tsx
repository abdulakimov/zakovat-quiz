import { getTranslations } from "@/src/i18n/server";
import SignupForm from "@/app/auth/signup/signup-form";
import { AuthLayout } from "@/src/components/layout/AuthLayout";

export default async function SignupPage() {
  const tAuth = await getTranslations("auth");

  return (
    <AuthLayout
      title={tAuth("signupTitle")}
      description={tAuth("signupDescription")}
    >
      <SignupForm />
    </AuthLayout>
  );
}
