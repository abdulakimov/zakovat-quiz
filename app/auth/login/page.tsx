import { getTranslations } from "@/src/i18n/server";
import LoginForm from "@/app/auth/login/login-form";
import { AuthShell } from "@/src/components/auth/AuthShell";

export default async function LoginPage() {
  const tAuth = await getTranslations("auth");

  return (
    <AuthShell
      eyebrow={tAuth("eyebrow")}
      title={tAuth("login.title")}
      subtitle={tAuth("login.subtitle")}
      benefits={[
        tAuth("benefits.fastAccess"),
        tAuth("benefits.workspaceSync"),
        tAuth("benefits.secureSession"),
      ]}
      privacyNote={tAuth("benefits.privacyNote")}
    >
      <LoginForm />
    </AuthShell>
  );
}
