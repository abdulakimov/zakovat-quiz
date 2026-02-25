import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { getPackDetails } from "@/src/actions/packs";
import { DeletePackButton } from "@/src/components/packs/DeletePackButton";
import { PackSettingsCard } from "@/src/components/packs/PackSettingsCard";
import { SettingsTabsLayout } from "@/src/components/layout/SettingsTabsLayout";
import { PackVisibilityBadge } from "@/src/components/packs/PackVisibilityBadge";
import { RoundsBuilder } from "@/src/components/packs/RoundsBuilder";
import { PlayIcon } from "@/src/ui/icons";

function NotAuthorized() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Not authorized"
        description="You do not have access to this pack."
        backHref="/app/packs"
        breadcrumbs={[
          { label: "App", href: "/app" },
          { label: "Packs", href: "/app/packs" },
          { label: "Not authorized" },
        ]}
      />
      <Link href="/app/packs" className="text-sm font-medium text-slate-900 underline">
        Back to packs
      </Link>
    </div>
  );
}

export default async function PackOverviewPage({
  params,
}: {
  params: Promise<{ packId?: string | string[] }>;
}) {
  const resolved = await params;
  const packId = Array.isArray(resolved.packId) ? resolved.packId[0] : resolved.packId;
  if (!packId) return <NotAuthorized />;

  const { pack, isOwner, audioAssets } = await getPackDetails(packId);
  if (!pack || !isOwner) return <NotAuthorized />;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title={pack.title}
        description={pack.description ?? "Pack overview and round structure."}
        backHref="/app/packs"
        breadcrumbs={[
          { label: "App", href: "/app" },
          { label: "Packs", href: "/app/packs" },
          { label: pack.title },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PackVisibilityBadge visibility={pack.visibility} />
            <Button asChild type="button" variant="outline" size="sm">
              <Link href={`/app/presenter/${pack.id}?new=1`}>
                <PlayIcon className="mr-2 h-4 w-4" aria-hidden />
                Run presenter
              </Link>
            </Button>
            <Button asChild type="button" variant="outline" size="sm">
              <Link href={`/app/packs/${pack.id}?tab=settings`}>Edit</Link>
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
            label: "Rounds",
            icon: "rounds",
            content: <RoundsBuilder packId={pack.id} rounds={pack.rounds} />,
          },
          {
            key: "settings",
            label: "Settings",
            icon: "settings",
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
