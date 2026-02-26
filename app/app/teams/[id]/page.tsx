import Link from "next/link";
import type { ComponentProps } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getTeamDetails } from "@/src/actions/teams";
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

function NotAuthorizedState() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Not authorized"
        description="You are not a member of this team."
        backHref="/app/teams"
        breadcrumbs={[
          { label: "App", href: "/app" },
          { label: "Teams", href: "/app/teams" },
          { label: "Not authorized" },
        ]}
      />
      <Link href="/app/teams" className="text-sm font-medium text-slate-900 underline">
        Back to teams
      </Link>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function expiresInLabel(date: Date) {
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return "Expired";
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days >= 1) return `Expires in ${days} day${days === 1 ? "" : "s"}`;
  if (hours >= 1) return `Expires in ${hours} hour${hours === 1 ? "" : "s"}`;
  const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  return `Expires in ${mins} min`;
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id?: string | string[] }>;
}) {
  const resolvedParams = await params;
  const teamId = Array.isArray(resolvedParams?.id) ? resolvedParams.id[0] : resolvedParams?.id;

  if (!teamId) return <NotAuthorizedState />;

  const { team, isMember, isOwner } = await getTeamDetails(teamId);
  if (!team) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Team not found"
          description="The requested team does not exist."
          backHref="/app/teams"
          breadcrumbs={[
            { label: "App", href: "/app" },
            { label: "Teams", href: "/app/teams" },
            { label: "Team not found" },
          ]}
        />
        <Link href="/app/teams" className="text-sm font-medium text-slate-900 underline">
          Back to teams
        </Link>
      </div>
    );
  }
  if (!isMember) return <NotAuthorizedState />;

  const baseItems: ComponentProps<typeof SettingsTabsLayout>["items"] = [
    {
      key: "members",
      label: "Members",
      icon: "users",
      content: (
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Members</h2>
            {team.members.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
                No active members found.
              </div>
            ) : (
              <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                {team.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col gap-2 rounded-lg px-1 py-1 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>{initials(member.user.name ?? member.user.username)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{member.user.name ?? member.user.username}</p>
                        <p className="truncate text-sm text-slate-500">
                          @{member.user.username} - {member.user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Badge variant={member.role === "OWNER" ? "success" : "secondary"}>{member.role}</Badge>
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
                <h2 className="text-lg font-semibold text-slate-900">Invite member</h2>
                <InviteMemberForm teamId={team.id} />
              </section>

              <Separator />
              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-slate-900">Pending invites</h2>
                {team.invites.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
                    <div className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                      <UserPlusIcon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-slate-900">No pending invites</p>
                    <p className="mt-1 text-sm text-slate-600">Invite teammates to collaborate on this team.</p>
                  </div>
                ) : (
                  <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    {team.invites.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex flex-col gap-3 rounded-lg border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>{initials(invite.invitedUser.name ?? invite.invitedUser.username)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">
                              {invite.invitedUser.name ?? invite.invitedUser.username}
                            </p>
                            <p className="truncate text-sm text-slate-500">
                              @{invite.invitedUser.username} - {invite.invitedUser.email}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <Badge variant="secondary">PENDING</Badge>
                              <span className="text-xs text-slate-500">{expiresInLabel(invite.expiresAt)}</span>
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
          label: "Settings",
          icon: "settings",
          content: (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Team settings</h2>
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
          label: "Danger",
          icon: "danger",
          content: (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-red-700">Danger zone</h2>
              <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-red-700">
                  Permanently delete this team and all associated members and invites.
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
        isOwner={false}
        extraActions={!isOwner ? <LeaveTeamButton teamId={team.id} /> : null}
      />

      <SettingsTabsLayout
        defaultKey="members"
        items={items}
      />
    </div>
  );
}
