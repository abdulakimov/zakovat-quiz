import type { Metadata } from "next";
import { getTranslations } from "@/src/i18n/server";
import LoginForm from "@/app/auth/login/login-form";
import { LoginShell } from "@/src/components/auth/LoginShell";
import { QrLoginPanel } from "@/src/components/auth/QrLoginPanel";

export async function generateMetadata(): Promise<Metadata> {
  const tMeta = await getTranslations("meta");
  return {
    title: tMeta("login"),
  };
}

export default async function LoginPage() {
  return (
    <LoginShell leftContent={<LoginForm />} rightContent={<QrLoginPanel />} />
  );
}
