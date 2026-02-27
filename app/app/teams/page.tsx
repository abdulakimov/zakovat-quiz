import Link from "next/link";
import { getLocale } from "next-intl/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getMyTeamsAndInvites } from "@/src/actions/teams";
import { CreateTeamDialog } from "@/src/components/teams/CreateTeamDialog";
import { TeamInviteDialogButton } from "@/src/components/teams/TeamInviteDialogButton";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { ActionGroup } from "@/src/components/ui/action-group";
import { IconButton } from "@/src/components/ui/icon-button";
import { getTranslations } from "@/src/i18n/server";
import { localizeHref, type AppLocale } from "@/src/i18n/config";
import { SettingsIcon, UserPlusIcon } from "@/src/ui/icons";

type ActiveTeamMembership = Awaited<ReturnType<typeof getMyTeamsAndInvites>>["activeTeams"][number];

function getTeamInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function TeamsPage() {
  const locale = (await getLocale()) as AppLocale;
  const [tTeams, tCommon] = await Promise.all([getTranslations("teams"), getTranslations("common")]);
  const { activeTeams } = await getMyTeamsAndInvites();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title={<span data-testid="teams-heading">{tTeams("title")}</span>}
        description={tTeams("description")}
        breadcrumbs={[
          { label: tCommon("app"), href: localizeHref(locale, "/app") },
          { label: tTeams("title") },
        ]}
        actions={<CreateTeamDialog />}
      />

      {activeTeams.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="space-y-1">
              <p className="text-base font-medium text-foreground">{tTeams("emptyTitle")}</p>
              <p className="text-sm text-muted-foreground">{tTeams("emptyDescription")}</p>
            </div>
            <CreateTeamDialog />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {activeTeams.map((membership: ActiveTeamMembership) => {
            const team = membership.team;
            const isOwner = membership.role === "OWNER";
            const memberCount = team._count?.members ?? null;

            return (
              <Card key={membership.id} className="transition hover:border-ring/40" data-testid="teams-card">
                <CardContent className="relative p-4">
                  <Link
                    href={localizeHref(locale, `/app/teams/${team.id}`)}
                    aria-label={tTeams("openTeam", { name: team.name })}
                    className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="relative z-10 flex min-w-0 items-start gap-3">
                      <Avatar className="h-11 w-11 rounded-xl">
                        {team.avatarAsset?.path ? (
                          <AvatarImage src={`/api/media/${team.avatarAsset.path}`} alt={team.name} className="rounded-xl" />
                        ) : null}
                        {!team.avatarAsset?.path ? (
                          <AvatarFallback className="rounded-xl bg-muted text-sm text-muted-foreground">
                            {getTeamInitials(team.name)}
                          </AvatarFallback>
                        ) : null}
                      </Avatar>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-base font-semibold text-foreground">{team.name}</p>
                          {isOwner ? <Badge variant="success">{tTeams("ownerBadge")}</Badge> : null}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {memberCount !== null ? tTeams("membersCount", { count: memberCount }) : tTeams("membersUnavailable")}
                        </p>
                        {team.slogan ? <p className="truncate text-xs text-muted-foreground">{team.slogan}</p> : null}
                        <p className="truncate text-xs text-muted-foreground">
                          {tTeams("ownerPrefix")}: {team.owner.name ?? team.owner.username}
                        </p>
                      </div>
                    </div>

                    <ActionGroup className="relative z-10 self-end sm:self-auto">
                      {isOwner ? (
                        <TeamInviteDialogButton teamId={team.id} teamName={team.name} />
                      ) : (
                        <IconButton
                          label={tTeams("inviteMember")}
                          tooltip={tTeams("inviteDisabledTooltip")}
                          disabled
                        >
                          <UserPlusIcon className="h-4 w-4" />
                        </IconButton>
                      )}

                      <IconButton label={tTeams("teamSettings")} tooltip={tCommon("settings")} asChild>
                        <Link href={localizeHref(locale, `/app/teams/${team.id}`)}>
                          <SettingsIcon className="h-4 w-4" />
                        </Link>
                      </IconButton>
                    </ActionGroup>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
