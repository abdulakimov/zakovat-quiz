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
                    <h2 className="text-lg font-semibold text-slate-900">{tProfile("activeTeamsTitle")}</h2>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        activeTeams.length >= MAX_ACTIVE_TEAMS
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {tProfile("activeTeamsCount", { count: activeTeams.length, max: MAX_ACTIVE_TEAMS })}
                    </span>
                  </div>
                  {activeTeams.length >= MAX_ACTIVE_TEAMS ? (
                    <p className="text-sm text-amber-700">{tProfile("activeTeamsLimitWarning")}</p>
                  ) : null}
                  {activeTeams.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
                      {tProfile("noActiveTeams")}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activeTeams.map((membership: ActiveTeamMembership) => (
                        <Link
                          key={membership.id}
                          href={localizeHref(locale, `/app/teams/${membership.team.id}`)}
                          className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                          aria-label={`Open ${membership.team.name}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-slate-900">{membership.team.name}</p>
                              <p className="text-sm text-slate-600">
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
                  <h2 className="text-lg font-semibold text-slate-900">{tProfile("pendingInvitesTitle")}</h2>
                  {pendingInvites.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
                      {tProfile("noPendingInvites")}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pendingInvites.map((invite: PendingInvite) => (
                        <div key={invite.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-medium text-slate-900">{invite.team.name}</p>
                              <p className="text-sm text-slate-600">
                                {tProfile("invitedBy", { name: invite.invitedBy.name ?? invite.invitedBy.username })}
                              </p>
                              <p className="text-xs text-slate-500">
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
