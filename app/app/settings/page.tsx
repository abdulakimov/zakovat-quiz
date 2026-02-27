import { getLocale } from "next-intl/server";
import { getTranslations } from "@/src/i18n/server";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { localizeHref, type AppLocale } from "@/src/i18n/config";

export default async function SettingsPage() {
  const locale = (await getLocale()) as AppLocale;
  const [tCommon, tSettings] = await Promise.all([getTranslations("common"), getTranslations("settingsPage")]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title={<span data-testid="settings-heading">{tSettings("title")}</span>}
        description={tSettings("description")}
        breadcrumbs={[
          { label: tCommon("app"), href: localizeHref(locale, "/app") },
          { label: tCommon("settings") },
        ]}
      />
      <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
        {tSettings("placeholder")}
      </div>
    </div>
  );
}
