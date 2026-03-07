import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { localizeHref, normalizeLocale } from "@/src/i18n/config";
import { getTranslations } from "@/src/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const tMeta = await getTranslations("meta");
  return {
    title: tMeta("signup"),
  };
}

export default async function SignupPage() {
  const headerStore = await headers();
  const locale = normalizeLocale(headerStore.get("x-locale"));
  redirect(`${localizeHref(locale, "/auth/login")}?info=signup_disabled`);
}
