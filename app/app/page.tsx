import Link from "next/link";
import { getLocale } from "next-intl/server";
import { getTranslations } from "@/src/i18n/server";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { localizeHref, type AppLocale } from "@/src/i18n/config";

export default async function AppHomePage() {
  const locale = (await getLocale()) as AppLocale;
  const [tCommon, tNav, tApp] = await Promise.all([
    getTranslations("common"),
    getTranslations("nav"),
    getTranslations("appHome"),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title={<span data-testid="app-heading">{tApp("title")}</span>}
        description={tApp("description")}
        breadcrumbs={[{ label: tCommon("app") }]}
      />
      <div className="flex flex-wrap gap-4 text-sm">
        <Link className="font-medium text-slate-900 underline" href={localizeHref(locale, "/app/teams")}>
          {tNav("teams")}
        </Link>
        <Link className="font-medium text-slate-900 underline" href={localizeHref(locale, "/app/profile")}>
          {tCommon("profile")}
        </Link>
      </div>
    </div>
  );
}
