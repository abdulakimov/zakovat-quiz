import { z } from "zod";

const trimmed = z.string().trim();

export const createTeamSchema = z.object({
  name: trimmed.min(3, "Team name must be 3-40 characters.").max(40, "Team name must be 3-40 characters."),
});

export const renameTeamSchema = z.object({
  teamId: trimmed.min(1, "Team is required."),
  name: trimmed.min(3, "Team name must be 3-40 characters.").max(40, "Team name must be 3-40 characters."),
});

export const updateTeamSettingsSchema = z.object({
  teamId: trimmed.min(1, "Team is required."),
  name: trimmed.min(3, "Team name must be 3-40 characters.").max(40, "Team name must be 3-40 characters."),
  slogan: z
    .union([trimmed.max(80, "Slogan must be 80 characters or fewer."), z.literal("")])
    .transform((value) => (value === "" ? null : value)),
  avatarAssetId: z
    .union([trimmed.min(1, "Avatar is invalid."), z.literal(""), z.null(), z.undefined()])
    .transform((value) => (typeof value === "string" && value.length > 0 ? value : null)),
});

export const inviteSchema = z.object({
  teamId: trimmed.min(1, "Team is required."),
  usernameOrEmail: trimmed.min(1, "Username or email is required."),
});

export const respondInviteSchema = z.object({
  inviteId: trimmed.min(1, "Invite is required."),
  action: z.enum(["accept", "decline"]),
});

export const leaveTeamSchema = z.object({
  teamId: trimmed.min(1, "Team is required."),
});

export const removeMemberSchema = z.object({
  teamId: trimmed.min(1, "Team is required."),
  memberId: trimmed.min(1, "Member is required."),
});

export const inviteManageSchema = z.object({
  inviteId: trimmed.min(1, "Invite is required."),
});

export const deleteTeamSchema = z.object({
  teamId: trimmed.min(1, "Team is required."),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type RenameTeamInput = z.infer<typeof renameTeamSchema>;
export type InviteInput = z.infer<typeof inviteSchema>;
export type RespondInviteInput = z.infer<typeof respondInviteSchema>;
export type LeaveTeamInput = z.infer<typeof leaveTeamSchema>;
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;
export type UpdateTeamSettingsInput = z.input<typeof updateTeamSettingsSchema>;
