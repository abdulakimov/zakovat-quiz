import Link from "next/link";
import { getLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { getPackDetails } from "@/src/actions/packs";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { SettingsTabsLayout } from "@/src/components/layout/SettingsTabsLayout";
import { DeletePackButton } from "@/src/components/packs/DeletePackButton";
import { PackSettingsCard } from "@/src/components/packs/PackSettingsCard";
import { PackVisibilityBadge } from "@/src/components/packs/PackVisibilityBadge";
import { RoundsBuilder } from "@/src/components/packs/RoundsBuilder";
import { localizeHref, type AppLocale } from "@/src/i18n/config";
import { getTranslations } from "@/src/i18n/server";
import { PlayIcon } from "@/src/ui/icons";

async function NotAuthorized({ locale }: { locale: AppLocale }) {
  const [tCommon, tPacks] = await Promise.all([getTranslations("common"), getTranslations("packs")]);

  return (
    <div className="space-y-4">
      <PageHeader
        title={tCommon("notAuthorized")}
        description={tPacks("notAuthorizedDescription")}
        backHref={localizeHref(locale, "/app/packs")}
        breadcrumbs={[
          { label: tCommon("app"), href: localizeHref(locale, "/app") },
          { label: tPacks("title"), href: localizeHref(locale, "/app/packs") },
          { label: tCommon("notAuthorized") },
        ]}
      />
      <Link href={localizeHref(locale, "/app/packs")} className="text-sm font-medium text-slate-900 underline">
        {tPacks("backToPacks")}
      </Link>
    </div>
  );
}

export default async function PackOverviewPage({
  params,
}: {
  params: Promise<{ packId?: string | string[] }>;
}) {
  const locale = (await getLocale()) as AppLocale;
  const [tPacks, tCommon] = await Promise.all([getTranslations("packs"), getTranslations("common")]);

  const resolved = await params;
  const packId = Array.isArray(resolved.packId) ? resolved.packId[0] : resolved.packId;
  if (!packId) return <NotAuthorized locale={locale} />;

  const { pack, isOwner, audioAssets } = await getPackDetails(packId);
  if (!pack || !isOwner) return <NotAuthorized locale={locale} />;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title={pack.title}
        description={pack.description ?? tPacks("overviewDescription")}
        backHref={localizeHref(locale, "/app/packs")}
        breadcrumbs={[
          { label: tCommon("app"), href: localizeHref(locale, "/app") },
          { label: tPacks("title"), href: localizeHref(locale, "/app/packs") },
          { label: pack.title },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PackVisibilityBadge visibility={pack.visibility} />
            <Button asChild type="button" variant="outline" size="sm">
              <Link href={localizeHref(locale, `/app/presenter/${pack.id}?new=1`)}>
                <PlayIcon className="mr-2 h-4 w-4" aria-hidden />
                {tPacks("runPresenter")}
              </Link>
            </Button>
            <Button asChild type="button" variant="outline" size="sm">
              <Link href={localizeHref(locale, `/app/packs/${pack.id}?tab=settings`)}>{tCommon("edit")}</Link>
            </Button>
            <DeletePackButton packId={pack.id} packTitle={pack.title} />
          </div>
        }
      />

      <SettingsTabsLayout
        defaultKey="rounds"
        items={[
          {
            key: "rounds",
            label: tPacks("tabs.rounds"),
            icon: "rounds",
            testId: "tab-rounds",
            content: <RoundsBuilder packId={pack.id} rounds={pack.rounds} />,
          },
          {
            key: "settings",
            label: tPacks("tabs.settings"),
            icon: "settings",
            testId: "tab-settings",
            content: (
              <div id="pack-settings">
                <PackSettingsCard
                  pack={{
                    id: pack.id,
                    defaultQuestionTimerPresetSec: pack.defaultQuestionTimerPresetSec,
                    breakTimerSec: pack.breakTimerSec,
                    breakMusicAssetId: pack.breakMusicAssetId,
                    breakMusicAsset: pack.breakMusicAsset,
                    timerMusicAssetId: pack.timerMusicAssetId,
                    timerMusicAsset: pack.timerMusicAsset,
                  }}
                  audioAssets={audioAssets}
                />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
