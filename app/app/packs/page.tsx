import { getLocale } from "next-intl/server";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { getMyPacks } from "@/src/actions/packs";
import { PacksListClient } from "@/src/components/packs/PacksListClient";
import { localizeHref, type AppLocale } from "@/src/i18n/config";
import { getTranslations } from "@/src/i18n/server";

type PackListItem = Awaited<ReturnType<typeof getMyPacks>>["packs"][number];

export default async function PacksPage() {
  const locale = (await getLocale()) as AppLocale;
  const [tPacks, tCommon] = await Promise.all([
    getTranslations("packs"),
    getTranslations("common"),
  ]);
  const { packs } = await getMyPacks();

  const items = packs.map((pack: PackListItem) => ({
    id: pack.id,
    title: pack.title,
    description: pack.description,
    visibility: pack.visibility,
    roundsCount: pack._count.rounds,
    updatedAtLabel: pack.updatedAt.toLocaleDateString(),
  }));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title={tPacks("title")}
        description={tPacks("pageDescription")}
        breadcrumbs={[
          { label: tCommon("app"), href: localizeHref(locale, "/app") },
          { label: tPacks("title") },
        ]}
      />
      <PacksListClient packs={items} />
    </div>
  );
}
