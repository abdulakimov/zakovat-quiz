"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { MAX_ACTIVE_TEAMS } from "@/src/lib/teams";
import { safeAction, type ActionResult } from "@/src/lib/actions";
import {
  createTeamSchema,
  deleteTeamSchema,
  inviteSchema,
  inviteManageSchema,
  leaveTeamSchema,
  removeMemberSchema,
  renameTeamSchema,
  respondInviteSchema,
  updateTeamSettingsSchema,
} from "@/src/schemas/teams";

export type TeamActionState = {
  code?: string;
  error?: string;
  success?: string;
};

function normalizeIdentifier(value: string) {
  return value.trim().toLowerCase();
}

function mapActionError(error: string, fieldErrors?: Record<string, string[] | undefined>) {
  const firstFieldError = Object.values(fieldErrors ?? {}).flat().find(Boolean);
  return firstFieldError ?? error;
}

function authErrorState<TState>(result: ActionResult<TState>): TState {
  if (!result.ok) {
    return { error: mapActionError(result.error, result.fieldErrors) } as TState;
  }

  return result.data;
}

export async function createTeam(_prevState: TeamActionState, formData: FormData): Promise<TeamActionState> {
  const user = await requireUser();

  const execute = safeAction(createTeamSchema, async (input) => {
    const team = await prisma.$transaction(async (tx) => {
      const activeCount = await tx.teamMember.count({
        where: {
          userId: user.id,
          status: "ACTIVE",
        },
      });

      if (activeCount >= 2) {
        return {
          code: "TEAM_LIMIT_2",
          error: `You can only be an active member of ${MAX_ACTIVE_TEAMS} teams.`,
        } satisfies TeamActionState;
      }

      const createdTeam = await tx.team.create({
        data: {
          name: input.name.trim(),
          ownerId: user.id,
        },
      });

      // Owner must also exist as an ACTIVE OWNER member row.
      await tx.teamMember.create({
        data: {
          teamId: createdTeam.id,
          userId: user.id,
          role: "OWNER",
          status: "ACTIVE",
        },
      });

      return createdTeam;
    });

    if ("error" in team) {
      return team;
    }

    revalidatePath("/app/teams");
    revalidatePath("/app/profile");
    redirect(`/app/teams/${team.id}`);
  });

  return authErrorState(await execute({ name: String(formData.get("name") ?? "") }));
}

export async function renameTeam(_prevState: TeamActionState, formData: FormData): Promise<TeamActionState> {
  const user = await requireUser();

  const execute = safeAction(renameTeamSchema, async (input) => {
    const team = await prisma.team.findUnique({
      where: { id: input.teamId },
      select: { id: true, ownerId: true },
    });

    if (!team) {
      return { error: "Team not found." } satisfies TeamActionState;
    }

    if (team.ownerId !== user.id) {
      return { error: "Only the team owner can rename this team." } satisfies TeamActionState;
    }

    await prisma.team.update({
      where: { id: input.teamId },
      data: { name: input.name.trim() },
    });

    revalidatePath("/app/teams");
    revalidatePath(`/app/teams/${input.teamId}`);
    return { success: "Team renamed." } satisfies TeamActionState;
  });

  return authErrorState(
    await execute({
      teamId: String(formData.get("teamId") ?? ""),
      name: String(formData.get("name") ?? ""),
    }),
  );
}

export async function updateTeamSettingsAction(
  _prevState: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const user = await requireUser();

  const execute = safeAction(updateTeamSettingsSchema, async (input) => {
    const team = await prisma.team.findUnique({
      where: { id: input.teamId },
      select: { id: true, ownerId: true },
    });

    if (!team) {
      return { error: "Team not found." } satisfies TeamActionState;
    }
    if (team.ownerId !== user.id) {
      return { error: "Only the team owner can update team settings." } satisfies TeamActionState;
    }

    if (input.avatarAssetId) {
      const asset = await prisma.mediaAsset.findUnique({
        where: { id: input.avatarAssetId },
        select: { id: true, ownerId: true, type: true },
      });
      if (!asset || asset.ownerId !== user.id || asset.type !== "IMAGE") {
        return { error: "Selected team avatar is invalid." } satisfies TeamActionState;
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.team.update({
        where: { id: team.id },
        data: {
          name: input.name.trim(),
          slogan: input.slogan,
          avatarAssetId: input.avatarAssetId,
        },
      });
    });

    revalidatePath(`/app/teams/${team.id}`);
    revalidatePath("/app/teams");
    revalidatePath("/app/profile");
    return { success: "Team settings updated." } satisfies TeamActionState;
  });

  return authErrorState(
    await execute({
      teamId: String(formData.get("teamId") ?? ""),
      name: String(formData.get("name") ?? ""),
      slogan: String(formData.get("slogan") ?? ""),
      avatarAssetId: formData.get("avatarAssetId") == null ? "" : String(formData.get("avatarAssetId") ?? ""),
    }),
  );
}

export async function deleteTeam(formData: FormData): Promise<TeamActionState> {
  const user = await requireUser();

  const execute = safeAction(deleteTeamSchema, async (input) => {
    const team = await prisma.team.findUnique({
      where: { id: input.teamId },
      select: { id: true, ownerId: true },
    });

    if (!team || team.ownerId !== user.id) {
      return { error: "Only the team owner can delete this team." } satisfies TeamActionState;
    }

    await prisma.team.delete({ where: { id: team.id } });
    revalidatePath("/app/teams");
    revalidatePath("/app/profile");
    return { success: "Team deleted." } satisfies TeamActionState;
  });

  const result = await execute({ teamId: String(formData.get("teamId") ?? "") });
  if (!result.ok) {
    logger.warn("Delete team denied", { userId: user.id, error: result.error });
    return { error: mapActionError(result.error, result.fieldErrors) };
  }

  if (result.data.error) {
    logger.warn("Delete team denied", { userId: user.id, error: result.data.error });
    return result.data;
  }

  return result.data;
}

export async function inviteMember(_prevState: TeamActionState, formData: FormData): Promise<TeamActionState> {
  const user = await requireUser();

  const execute = safeAction(inviteSchema, async (input) => {
    const team = await prisma.team.findUnique({
      where: { id: input.teamId },
      select: { id: true, ownerId: true },
    });

    if (!team) {
      return { error: "Team not found." } satisfies TeamActionState;
    }

    if (team.ownerId !== user.id) {
      return { error: "Only the team owner can invite members." } satisfies TeamActionState;
    }

    const identifier = normalizeIdentifier(input.usernameOrEmail);
    if (!identifier) {
      return { error: "Username or email is required." } satisfies TeamActionState;
    }

    if (identifier === user.username.toLowerCase()) {
      return { code: "SELF_INVITE", error: "You cannot invite yourself." } satisfies TeamActionState;
    }

    const invitee = await prisma.user.findFirst({
      where: {
        OR: [{ username: identifier }, { email: identifier }],
      },
      select: { id: true, email: true, username: true },
    });

    const genericResponse = {
      success: "If the user is eligible, an invitation has been sent.",
    } satisfies TeamActionState;

    if (!invitee) {
      return genericResponse;
    }

    const existingMembership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: team.id,
          userId: invitee.id,
        },
      },
      select: { id: true, status: true },
    });

    if (existingMembership?.status === "ACTIVE") {
      return {
        code: "ALREADY_MEMBER",
        error: "This user is already an active member of the team.",
      } satisfies TeamActionState;
    }

    await prisma.teamInvite.upsert({
      where: {
        teamId_invitedUserId: {
          teamId: team.id,
          invitedUserId: invitee.id,
        },
      },
      update: {
        invitedById: user.id,
        status: "PENDING",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      create: {
        teamId: team.id,
        invitedUserId: invitee.id,
        invitedById: user.id,
        status: "PENDING",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    revalidatePath(`/app/teams/${team.id}`);
    revalidatePath("/app/profile");
    return genericResponse;
  });

  return authErrorState(
    await execute({
      teamId: String(formData.get("teamId") ?? ""),
      usernameOrEmail: String(formData.get("usernameOrEmail") ?? ""),
    }),
  );
}

async function respondToInvite(userId: string, input: { inviteId: string; action: "accept" | "decline" }) {
  return prisma.$transaction(async (tx) => {
    const invite = await tx.teamInvite.findUnique({
      where: { id: input.inviteId },
      include: {
        team: {
          select: { id: true, name: true },
        },
      },
    });

    if (!invite || invite.invitedUserId !== userId) {
      return { error: "Invite not found." } satisfies TeamActionState;
    }

    if (invite.status !== "PENDING") {
      return { error: "Invite has already been handled." } satisfies TeamActionState;
    }

    if (input.action === "decline") {
      await tx.teamInvite.update({
        where: { id: invite.id },
        data: { status: "DECLINED" },
      });

      return { success: "Invite declined." } satisfies TeamActionState;
    }

    if (invite.expiresAt <= new Date()) {
      await tx.teamInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      });
      return {
        code: "INVITE_EXPIRED",
        error: "This invite has expired. Ask the team owner to resend it.",
      } satisfies TeamActionState;
    }

    const activeCount = await tx.teamMember.count({
      where: {
        userId,
        status: "ACTIVE",
      },
    });

    if (activeCount >= 2) {
      return {
        code: "TEAM_LIMIT_2",
        error: `You already have ${MAX_ACTIVE_TEAMS} active teams. Leave one before accepting another invite.`,
      } satisfies TeamActionState;
    }

    await tx.teamMember.upsert({
      where: {
        teamId_userId: {
          teamId: invite.teamId,
          userId,
        },
      },
      update: {
        status: "ACTIVE",
        role: "MEMBER",
      },
      create: {
        teamId: invite.teamId,
        userId,
        status: "ACTIVE",
        role: "MEMBER",
      },
    });

    await tx.teamInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED" },
    });

    return { success: `Joined ${invite.team.name}.` } satisfies TeamActionState;
  });
}

export async function acceptInvite(_prevState: TeamActionState, formData: FormData): Promise<TeamActionState> {
  const user = await requireUser();
  const execute = safeAction(respondInviteSchema, async (input) => {
    if (input.action !== "accept") {
      return { error: "Invalid invite action." } satisfies TeamActionState;
    }

    const result = await respondToInvite(user.id, input);
    revalidatePath("/app/profile");
    if (!result.error) {
      revalidatePath("/app/teams");
    }
    return result;
  });

  return authErrorState(
    await execute({
      inviteId: String(formData.get("inviteId") ?? ""),
      action: "accept",
    }),
  );
}

export async function declineInvite(_prevState: TeamActionState, formData: FormData): Promise<TeamActionState> {
  const user = await requireUser();
  const execute = safeAction(respondInviteSchema, async (input) => {
    if (input.action !== "decline") {
      return { error: "Invalid invite action." } satisfies TeamActionState;
    }

    const result = await respondToInvite(user.id, input);
    revalidatePath("/app/profile");
    return result;
  });

  return authErrorState(
    await execute({
      inviteId: String(formData.get("inviteId") ?? ""),
      action: "decline",
    }),
  );
}

export async function leaveTeam(_prevState: TeamActionState, formData: FormData): Promise<TeamActionState> {
  const user = await requireUser();

  const execute = safeAction(leaveTeamSchema, async (input) => {
    const team = await prisma.team.findUnique({
      where: { id: input.teamId },
      select: { id: true, ownerId: true, name: true },
    });

    if (!team) {
      return { error: "Team not found." } satisfies TeamActionState;
    }

    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: input.teamId,
          userId: user.id,
        },
      },
      select: { id: true, role: true, status: true },
    });

    if (!membership || membership.status !== "ACTIVE") {
      return { error: "You are not an active member of this team." } satisfies TeamActionState;
    }

    if (membership.role === "OWNER" || team.ownerId === user.id) {
      return {
        error: "Team owners cannot leave. Delete the team or transfer ownership first.",
      } satisfies TeamActionState;
    }

    await prisma.teamMember.delete({
      where: { id: membership.id },
    });

    revalidatePath("/app/profile");
    revalidatePath("/app/teams");
    revalidatePath(`/app/teams/${team.id}`);
    return { success: `You left ${team.name}.` } satisfies TeamActionState;
  });

  return authErrorState(await execute({ teamId: String(formData.get("teamId") ?? "") }));
}

export async function removeMemberAction(_prevState: TeamActionState, formData: FormData): Promise<TeamActionState> {
  const user = await requireUser();

  const execute = safeAction(removeMemberSchema, async (input) => {
    const team = await prisma.team.findUnique({
      where: { id: input.teamId },
      select: { id: true, ownerId: true, name: true },
    });

    if (!team) {
      return { error: "Team not found." } satisfies TeamActionState;
    }

    if (team.ownerId !== user.id) {
      return { error: "Only the team owner can remove members." } satisfies TeamActionState;
    }

    const membership = await prisma.teamMember.findUnique({
      where: {
        id: input.memberId,
      },
      include: {
        user: { select: { id: true, username: true, name: true } },
      },
    });

    if (!membership || membership.teamId !== team.id || membership.status !== "ACTIVE") {
      return { error: "Member not found." } satisfies TeamActionState;
    }

    if (membership.role === "OWNER") {
      return { error: "Cannot remove team owner." } satisfies TeamActionState;
    }

    if (membership.userId === user.id || membership.user.id === user.id) {
      return { error: "You cannot remove yourself from your own team." } satisfies TeamActionState;
    }

    await prisma.teamMember.delete({ where: { id: membership.id } });

    revalidatePath(`/app/teams/${team.id}`);
    revalidatePath("/app/teams");
    revalidatePath("/app/profile");
    return {
      success: `Removed ${membership.user.name ?? membership.user.username} from ${team.name}.`,
    } satisfies TeamActionState;
  });

  return authErrorState(
    await execute({
      teamId: String(formData.get("teamId") ?? ""),
      memberId: String(formData.get("memberId") ?? ""),
    }),
  );
}

export async function removeMember(prevState: TeamActionState, formData: FormData): Promise<TeamActionState> {
  return removeMemberAction(prevState, formData);
}

export async function resendInvite(_prevState: TeamActionState, formData: FormData): Promise<TeamActionState> {
  const user = await requireUser();
  const execute = safeAction(inviteManageSchema, async (input) => {
    const invite = await prisma.teamInvite.findUnique({
      where: { id: input.inviteId },
      include: {
        team: { select: { id: true, ownerId: true, name: true } },
        invitedUser: { select: { username: true, name: true } },
      },
    });

    if (!invite) return { error: "Invite not found." } satisfies TeamActionState;
    if (invite.team.ownerId !== user.id) {
      return { error: "Only the team owner can manage invites." } satisfies TeamActionState;
    }

    await prisma.teamInvite.update({
      where: { id: invite.id },
      data: {
        status: "PENDING",
        invitedById: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    revalidatePath(`/app/teams/${invite.team.id}`);
    revalidatePath("/app/profile");
    return { success: `Invite resent to ${invite.invitedUser.name ?? invite.invitedUser.username}.` } satisfies TeamActionState;
  });
  return authErrorState(await execute({ inviteId: String(formData.get("inviteId") ?? "") }));
}

export async function cancelInvite(_prevState: TeamActionState, formData: FormData): Promise<TeamActionState> {
  const user = await requireUser();
  const execute = safeAction(inviteManageSchema, async (input) => {
    const invite = await prisma.teamInvite.findUnique({
      where: { id: input.inviteId },
      include: {
        team: { select: { id: true, ownerId: true } },
      },
    });
    if (!invite) return { error: "Invite not found." } satisfies TeamActionState;
    if (invite.team.ownerId !== user.id) {
      return { error: "Only the team owner can manage invites." } satisfies TeamActionState;
    }

    await prisma.teamInvite.update({
      where: { id: invite.id },
      data: { status: "CANCELED" },
    });

    revalidatePath(`/app/teams/${invite.team.id}`);
    revalidatePath("/app/profile");
    return { success: "Invite canceled." } satisfies TeamActionState;
  });
  return authErrorState(await execute({ inviteId: String(formData.get("inviteId") ?? "") }));
}

export async function getMyTeamsAndInvites() {
  const user = await requireUser();

  const [activeTeams, pendingInvites] = await Promise.all([
    prisma.teamMember.findMany({
      where: {
        userId: user.id,
        status: "ACTIVE",
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            owner: {
              select: {
                id: true,
                username: true,
                name: true,
              },
            },
            slogan: true,
            avatarAsset: {
              select: { id: true, path: true },
            },
            _count: {
              select: { members: true },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.teamInvite.findMany({
      where: {
        invitedUserId: user.id,
        status: "PENDING",
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
        invitedBy: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { user, activeTeams, pendingInvites };
}

export async function getTeamDetails(teamId: string) {
  const user = await requireUser();

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      ownerId: true,
      owner: {
        select: { id: true, username: true, name: true },
      },
      slogan: true,
      avatarAsset: {
        select: { id: true, path: true },
      },
      members: {
        where: { status: "ACTIVE" },
        include: {
          user: {
            select: { id: true, username: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      invites: {
        where: { status: "PENDING" },
        include: {
          invitedUser: {
            select: { id: true, username: true, name: true, email: true },
          },
          invitedBy: {
            select: { id: true, username: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!team) {
    return { user, team: null, isMember: false, isOwner: false };
  }

  const myMembership = team.members.find((member) => member.userId === user.id) ?? null;
  const isOwner = team.ownerId === user.id;
  const isMember = isOwner || Boolean(myMembership);

  return { user, team, isOwner, isMember, myMembership };
}
