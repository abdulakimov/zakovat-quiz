import type { Metadata } from "next";
import { Boxes, FolderKanban, Settings, Users } from "lucide-react";
import { getLocale } from "next-intl/server";
import { getMyPacks } from "@/src/actions/packs";
import { getMyTeamsAndInvites } from "@/src/actions/teams";
import { getTranslations } from "@/src/i18n/server";
import { AppDashboard } from "@/src/components/dashboard/AppDashboard";
import { localizeHref, type AppLocale } from "@/src/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const tMeta = await getTranslations("meta");
  return {
    title: tMeta("home"),
  };
}

export default async function AppHomePage() {
  const locale = (await getLocale()) as AppLocale;
  const [tCommon, tPacks, tApp, packsResult, teamsResult] = await Promise.all([
    getTranslations("common"),
    getTranslations("packs"),
    getTranslations("appHome"),
    getMyPacks(),
    getMyTeamsAndInvites(),
  ]);

  const totalPacks = packsResult.packs.length;
  const totalRounds = packsResult.packs.reduce((sum, pack) => sum + pack._count.rounds, 0);
  const activeTeams = teamsResult.activeTeams.length;
  const pendingInvites = teamsResult.pendingInvites.length;

  const visibilityLabels = {
    DRAFT: tPacks("visibility.draft"),
    PRIVATE: tPacks("visibility.private"),
    PUBLIC: tPacks("visibility.public"),
  } as const;

  const recentPacks = packsResult.packs.slice(0, 5).map((pack) => ({
    id: pack.id,
    href: localizeHref(locale, `/app/packs/${pack.id}`),
    title: pack.title,
    updatedAtLabel: tApp("recent.updatedAt", {
      date: pack.updatedAt.toLocaleDateString(locale),
    }),
    roundsLabel: tPacks("roundsCount", { count: pack._count.rounds }),
    visibilityLabel: visibilityLabels[pack.visibility],
  }));

  return (
    <AppDashboard
      title={tApp("title")}
      description={tApp("description")}
      primaryCta={{
        label: tApp("hero.primaryCta"),
        href: localizeHref(locale, "/app/packs"),
      }}
      secondaryCta={{
        label: tApp("hero.secondaryCta"),
        href: localizeHref(locale, "/app/teams"),
      }}
      stats={[
        {
          label: tApp("stats.totalPacks.label"),
          value: String(totalPacks),
          hint: tApp("stats.totalPacks.hint"),
        },
        {
          label: tApp("stats.totalRounds.label"),
          value: String(totalRounds),
          hint: tApp("stats.totalRounds.hint"),
        },
        {
          label: tApp("stats.activeTeams.label"),
          value: String(activeTeams),
          hint: tApp("stats.activeTeams.hint", { count: pendingInvites }),
        },
      ]}
      quickActionsTitle={tApp("quickActions.title")}
      quickActionsDescription={tApp("quickActions.description")}
      quickActions={[
        {
          href: localizeHref(locale, "/app/packs"),
          title: tApp("quickActions.items.packs.title"),
          description: tApp("quickActions.items.packs.description"),
          icon: <FolderKanban className="h-4 w-4" aria-hidden />,
        },
        {
          href: localizeHref(locale, "/app/teams"),
          title: tApp("quickActions.items.teams.title"),
          description: tApp("quickActions.items.teams.description"),
          icon: <Users className="h-4 w-4" aria-hidden />,
        },
        {
          href: localizeHref(locale, "/app/profile"),
          title: tCommon("profile"),
          description: tApp("quickActions.items.profile.description"),
          icon: <Boxes className="h-4 w-4" aria-hidden />,
        },
        {
          href: localizeHref(locale, "/app/settings"),
          title: tCommon("settings"),
          description: tApp("quickActions.items.settings.description"),
          icon: <Settings className="h-4 w-4" aria-hidden />,
        },
      ]}
      recentTitle={tApp("recent.title")}
      recentDescription={tApp("recent.description")}
      recentPacks={recentPacks}
      emptyRecentTitle={tApp("recent.emptyTitle")}
      emptyRecentDescription={tApp("recent.emptyDescription")}
      openLabel={tApp("recent.open")}
    />
  );
}
