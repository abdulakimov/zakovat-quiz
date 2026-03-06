import { getTranslations } from "@/src/i18n/server";
import SignupForm from "@/app/auth/signup/signup-form";
import { AuthShell } from "@/src/components/auth/AuthShell";

export default async function SignupPage() {
  const tAuth = await getTranslations("auth");

  return (
    <AuthShell
      eyebrow={tAuth("eyebrow")}
      title={tAuth("signup.title")}
      subtitle={tAuth("signup.subtitle")}
      benefits={[
        tAuth("benefits.fastAccess"),
        tAuth("benefits.workspaceSync"),
        tAuth("benefits.secureSession"),
      ]}
      privacyNote={tAuth("benefits.privacyNote")}
    >
      <SignupForm />
    </AuthShell>
  );
}
