import Link from "next/link";
import type { ComponentProps } from "react";
import { getLocale } from "next-intl/server";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getTeamDetails } from "@/src/actions/teams";
import { getTranslations } from "@/src/i18n/server";
import { localizeHref, type AppLocale } from "@/src/i18n/config";
import { DeleteTeamButton } from "@/src/components/teams/DeleteTeamButton";
import { InviteMemberForm } from "@/src/components/teams/InviteMemberForm";
import { LeaveTeamButton } from "@/src/components/teams/LeaveTeamButton";
import { MemberRowActions } from "@/src/components/teams/MemberRowActions";
import { PendingInviteActions } from "@/src/components/teams/PendingInviteActions";
import { TeamDetailHeader } from "@/src/components/teams/TeamDetailHeader";
import { TeamSettingsCard } from "@/src/components/teams/TeamSettingsCard";
import { SettingsTabsLayout } from "@/src/components/layout/SettingsTabsLayout";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { UserPlusIcon } from "@/src/ui/icons";

type TeamMember = NonNullable<Awaited<ReturnType<typeof getTeamDetails>>["team"]>["members"][number];
type TeamInvite = NonNullable<Awaited<ReturnType<typeof getTeamDetails>>["team"]>["invites"][number];

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function expiresInLabel(date: Date, tTeams: Awaited<ReturnType<typeof getTranslations>>) {
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return tTeams("inviteExpired");
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days >= 1) return tTeams("inviteExpiresInDays", { count: days });
  if (hours >= 1) return tTeams("inviteExpiresInHours", { count: hours });
  const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  return tTeams("inviteExpiresInMins", { count: mins });
}

function NotAuthorizedState({ locale, tCommon, tTeams }: { locale: AppLocale; tCommon: Awaited<ReturnType<typeof getTranslations>>; tTeams: Awaited<ReturnType<typeof getTranslations>> }) {
  return (
    <div className="space-y-4">
      <PageHeader
        title={tCommon("notAuthorized")}
        description={tTeams("notMember")}
        backHref={localizeHref(locale, "/app/teams")}
        breadcrumbs={[
          { label: tCommon("app"), href: localizeHref(locale, "/app") },
          { label: tTeams("title"), href: localizeHref(locale, "/app/teams") },
          { label: tCommon("notAuthorized") },
        ]}
      />
      <Link href={localizeHref(locale, "/app/teams")} className="text-sm font-medium text-foreground underline">
        {tTeams("backToTeams")}
      </Link>
    </div>
  );
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id?: string | string[] }>;
}) {
  const locale = (await getLocale()) as AppLocale;
  const [tCommon, tTeams] = await Promise.all([getTranslations("common"), getTranslations("teams")]);

  const resolvedParams = await params;
  const teamId = Array.isArray(resolvedParams?.id) ? resolvedParams.id[0] : resolvedParams?.id;

  if (!teamId) return <NotAuthorizedState locale={locale} tCommon={tCommon} tTeams={tTeams} />;

  const { team, isMember, isOwner } = await getTeamDetails(teamId);
  if (!team) {
    return (
      <div className="space-y-4">
        <PageHeader
          title={tTeams("teamNotFound")}
          description={tTeams("teamNotFoundDescription")}
          backHref={localizeHref(locale, "/app/teams")}
          breadcrumbs={[
            { label: tCommon("app"), href: localizeHref(locale, "/app") },
            { label: tTeams("title"), href: localizeHref(locale, "/app/teams") },
            { label: tTeams("teamNotFound") },
          ]}
        />
        <Link href={localizeHref(locale, "/app/teams")} className="text-sm font-medium text-foreground underline">
          {tTeams("backToTeams")}
        </Link>
      </div>
    );
  }
  if (!isMember) return <NotAuthorizedState locale={locale} tCommon={tCommon} tTeams={tTeams} />;

  const baseItems: ComponentProps<typeof SettingsTabsLayout>["items"] = [
    {
      key: "members",
      label: tTeams("membersTab"),
      icon: "users",
      content: (
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">{tTeams("membersTab")}</h2>
            {team.members.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground" data-testid="team-members-card">
                {tTeams("noActiveMembers")}
              </div>
            ) : (
              <div className="space-y-2 rounded-xl border border-border bg-card p-4 shadow-sm" data-testid="team-members-card">
                {team.members.map((member: TeamMember) => (
                  <div
                    key={member.id}
                    className="flex flex-col gap-2 rounded-lg px-1 py-1 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>{initials(member.user.name ?? member.user.username)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{member.user.name ?? member.user.username}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          @{member.user.username} - {member.user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Badge variant={member.role === "OWNER" ? "success" : "secondary"}>
                        {member.role === "OWNER" ? tTeams("ownerBadge") : tTeams("memberBadge")}
                      </Badge>
                      {isOwner && member.role !== "OWNER" ? (
                        <MemberRowActions
                          teamId={team.id}
                          memberId={member.id}
                          memberLabel={member.user.name ?? `@${member.user.username}`}
                        />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {isOwner ? (
            <>
              <Separator />
              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">{tTeams("inviteMember")}</h2>
                <InviteMemberForm teamId={team.id} />
              </section>

              <Separator />
              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">{tTeams("pendingInvites")}</h2>
                {team.invites.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center" data-testid="team-invites-card">
                    <div className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <UserPlusIcon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-foreground">{tTeams("noPendingInvites")}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{tTeams("inviteTeammatesHint")}</p>
                  </div>
                ) : (
                  <div className="space-y-2 rounded-xl border border-border bg-card p-4 shadow-sm" data-testid="team-invites-card">
                    {team.invites.map((invite: TeamInvite) => (
                      <div
                        key={invite.id}
                        className="flex flex-col gap-3 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>{initials(invite.invitedUser.name ?? invite.invitedUser.username)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">
                              {invite.invitedUser.name ?? invite.invitedUser.username}
                            </p>
                            <p className="truncate text-sm text-muted-foreground">
                              @{invite.invitedUser.username} - {invite.invitedUser.email}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <Badge variant="secondary">{tTeams("pendingBadge")}</Badge>
                              <span className="text-xs text-muted-foreground">{expiresInLabel(invite.expiresAt, tTeams)}</span>
                            </div>
                          </div>
                        </div>
                        <PendingInviteActions inviteId={invite.id} />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : null}
        </div>
      ),
    },
  ];

  const ownerItems: ComponentProps<typeof SettingsTabsLayout>["items"] = isOwner
    ? [
        {
          key: "settings",
          label: tCommon("settings"),
          icon: "settings",
          content: (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">{tTeams("teamSettings")}</h2>
              <TeamSettingsCard
                team={{
                  id: team.id,
                  name: team.name,
                  slogan: team.slogan,
                  avatarAssetId: team.avatarAsset?.id ?? null,
                  avatarAsset: team.avatarAsset ? { path: team.avatarAsset.path } : null,
                }}
              />
            </section>
          ),
        },
        {
          key: "danger",
          label: tTeams("dangerTab"),
          icon: "danger",
          content: (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-destructive">{tTeams("dangerZone")}</h2>
              <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-destructive">
                  {tTeams("deleteTeamHint")}
                </p>
                <div className="shrink-0">
                  <DeleteTeamButton teamId={team.id} teamName={team.name} />
                </div>
              </div>
            </section>
          ),
        },
      ]
    : [];

  const items = isOwner ? [...baseItems, ...ownerItems] : baseItems;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <TeamDetailHeader
        teamId={team.id}
        initialName={team.name}
        avatarUrl={team.avatarAsset?.path ? `/api/media/${team.avatarAsset.path}` : null}
        slogan={team.slogan}
        memberCount={team.members.length}
        isOwner={isOwner}
        extraActions={!isOwner ? <LeaveTeamButton teamId={team.id} /> : null}
      />

      <SettingsTabsLayout defaultKey="members" items={items} />
    </div>
  );
}
