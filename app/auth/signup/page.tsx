import { getTranslations } from "@/src/i18n/server";
import SignupForm from "@/app/auth/signup/signup-form";
import { AuthShell } from "@/src/components/auth/AuthShell";

export default async function SignupPage() {
  const tAuth = await getTranslations("auth");

  return (
    <AuthShell
      title={tAuth("signup.title")}
      subtitle={tAuth("signup.subtitle")}
      visualTitle={tAuth("visual.phoneTitle")}
      visualSubtitle={tAuth("visual.phoneSubtitle")}
      visualHelper={tAuth("visual.phoneHelper")}
    >
      <SignupForm />
    </AuthShell>
  );
}
