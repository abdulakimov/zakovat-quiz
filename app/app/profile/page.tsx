import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { getMyTeamsAndInvites } from "@/src/actions/teams";
import { SettingsTabsLayout } from "@/src/components/layout/SettingsTabsLayout";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { ProfileSecurityForm, ProfileSettingsForm } from "@/src/components/profile/ProfileSettingsForm";
import { UiDiagnostics } from "@/src/components/UiDiagnostics";
import { InviteResponseButtons } from "@/src/components/teams/InviteResponseButtons";
import { localizeHref, type AppLocale } from "@/src/i18n/config";
import { MAX_ACTIVE_TEAMS } from "@/src/lib/teams";

type ActiveTeamMembership = Awaited<ReturnType<typeof getMyTeamsAndInvites>>["activeTeams"][number];
type PendingInvite = Awaited<ReturnType<typeof getMyTeamsAndInvites>>["pendingInvites"][number];

export default async function ProfilePage() {
  const locale = (await getLocale()) as AppLocale;
  const [tProfile, tCommon] = await Promise.all([getTranslations("profile"), getTranslations("common")]);
  const { user, activeTeams, pendingInvites } = await getMyTeamsAndInvites();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <PageHeader
        title={tProfile("pageTitle")}
        description={tProfile("pageDescription", { name: user.displayName ?? user.name ?? user.username })}
        breadcrumbs={[
          { label: tCommon("app"), href: localizeHref(locale, "/app") },
          { label: tProfile("pageTitle") },
        ]}
      />

      <SettingsTabsLayout
        defaultKey="profile"
        items={[
          {
            key: "profile",
            label: tProfile("tabLabel"),
            icon: "profile",
            content: (
              <div className="space-y-8">
                <ProfileSettingsForm user={user} />

                <section className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-lg font-semibold text-foreground">{tProfile("activeTeamsTitle")}</h2>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        activeTeams.length >= MAX_ACTIVE_TEAMS
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {tProfile("activeTeamsCount", { count: activeTeams.length, max: MAX_ACTIVE_TEAMS })}
                    </span>
                  </div>
                  {activeTeams.length >= MAX_ACTIVE_TEAMS ? (
                    <p className="text-sm text-destructive">{tProfile("activeTeamsLimitWarning")}</p>
                  ) : null}
                  {activeTeams.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground" data-testid="profile-card">
                      {tProfile("noActiveTeams")}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activeTeams.map((membership: ActiveTeamMembership) => (
                        <Link
                          key={membership.id}
                          href={localizeHref(locale, `/app/teams/${membership.team.id}`)}
                          className="block rounded-xl border border-border bg-card p-4 shadow-sm transition hover:border-ring/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={`Open ${membership.team.name}`}
                          data-testid="profile-card"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-foreground">{membership.team.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {membership.role === "OWNER" ? tProfile("ownerRole") : tProfile("memberRole")} |{" "}
                                {tProfile("activeMembers", { count: membership.team._count.members })}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>

                <section className="space-y-3">
                  <h2 className="text-lg font-semibold text-foreground">{tProfile("pendingInvitesTitle")}</h2>
                  {pendingInvites.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground" data-testid="profile-invites-card">
                      {tProfile("noPendingInvites")}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pendingInvites.map((invite: PendingInvite) => (
                        <div key={invite.id} className="rounded-xl border border-border bg-card p-4 shadow-sm" data-testid="profile-invites-card">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-medium text-foreground">{invite.team.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {tProfile("invitedBy", { name: invite.invitedBy.name ?? invite.invitedBy.username })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {tProfile("expires", { date: invite.expiresAt.toLocaleDateString() })}
                              </p>
                            </div>
                            <InviteResponseButtons inviteId={invite.id} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            ),
          },
          {
            key: "security",
            label: tProfile("securityTabLabel"),
            icon: "security",
            content: <ProfileSecurityForm />,
          },
        ]}
      />
      <UiDiagnostics />
    </div>
  );
}
