import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getMyTeamsAndInvites } from "@/src/actions/teams";
import { CreateTeamDialog } from "@/src/components/teams/CreateTeamDialog";
import { TeamInviteDialogButton } from "@/src/components/teams/TeamInviteDialogButton";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { ActionGroup } from "@/src/components/ui/action-group";
import { IconButton } from "@/src/components/ui/icon-button";
import { SettingsIcon, UserPlusIcon } from "@/src/ui/icons";

function getTeamInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function TeamsPage() {
  const { activeTeams } = await getMyTeamsAndInvites();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Teams"
        description="Create a team, manage members, and collaborate on quizzes."
        breadcrumbs={[
          { label: "App", href: "/app" },
          { label: "Teams" },
        ]}
        actions={<CreateTeamDialog />}
      />

      {activeTeams.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="space-y-1">
              <p className="text-base font-medium text-slate-900">No teams yet</p>
              <p className="text-sm text-slate-600">Create your first team to start inviting collaborators.</p>
            </div>
            <CreateTeamDialog />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {activeTeams.map((membership) => {
            const team = membership.team;
            const isOwner = membership.role === "OWNER";
            const memberCount = team._count?.members ?? null;

            return (
              <Card key={membership.id} className="transition hover:border-slate-300">
                <CardContent className="relative p-4">
                  <Link
                    href={`/app/teams/${team.id}`}
                    aria-label={`Open ${team.name}`}
                    className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                  />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="relative z-10 flex min-w-0 items-start gap-3">
                      <Avatar className="h-11 w-11 rounded-xl">
                        {team.avatarAsset?.path ? (
                          <AvatarImage src={`/api/media/${team.avatarAsset.path}`} alt={team.name} className="rounded-xl" />
                        ) : null}
                        {!team.avatarAsset?.path ? (
                          <AvatarFallback className="rounded-xl bg-slate-100 text-sm">
                            {getTeamInitials(team.name)}
                          </AvatarFallback>
                        ) : null}
                      </Avatar>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-base font-semibold text-slate-900">{team.name}</p>
                          {isOwner ? <Badge variant="success">Owner</Badge> : null}
                        </div>
                        <p className="text-sm text-slate-600">
                          {memberCount !== null ? `${memberCount} members` : "Members count unavailable"}
                        </p>
                        {team.slogan ? <p className="truncate text-xs text-slate-500">{team.slogan}</p> : null}
                        <p className="truncate text-xs text-slate-500">
                          Owner: {team.owner.name ?? team.owner.username}
                        </p>
                      </div>
                    </div>

                    <ActionGroup className="relative z-10 self-end sm:self-auto">
                      {isOwner ? (
                        <TeamInviteDialogButton teamId={team.id} teamName={team.name} />
                      ) : (
                        <IconButton
                          label="Invite member"
                          tooltip="Only team owners can invite members"
                          disabled
                        >
                          <UserPlusIcon className="h-4 w-4" />
                        </IconButton>
                      )}

                      <IconButton label="Team settings" tooltip="Settings" asChild>
                        <Link href={`/app/teams/${team.id}`}>
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
