import { getTranslations } from "@/src/i18n/server";
import LoginForm from "@/app/auth/login/login-form";
import { AuthShell } from "@/src/components/auth/AuthShell";

export default async function LoginPage() {
  const tAuth = await getTranslations("auth");

  return (
    <AuthShell
      title={tAuth("login.title")}
      subtitle={tAuth("login.subtitle")}
      visualTitle={tAuth("visual.phoneTitle")}
      visualSubtitle={tAuth("visual.phoneSubtitle")}
      visualHelper={tAuth("visual.phoneHelper")}
    >
      <LoginForm />
    </AuthShell>
  );
}
