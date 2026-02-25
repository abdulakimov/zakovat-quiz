import { z } from "zod";

const trimmed = z.string().trim();
const passwordBase = z
  .string()
  .min(10, "Password must be at least 10 characters.")
  .refine((value) => /[A-Za-z]/.test(value), "Password must include at least 1 letter.")
  .refine((value) => /\d/.test(value), "Password must include at least 1 number.");

export const updateProfileSchema = z.object({
  name: z
    .union([trimmed.max(100, "Name is too long."), z.literal("")])
    .transform((value) => (value === "" ? null : value)),
  username: trimmed
    .min(3, "Username must be 3-32 characters.")
    .max(32, "Username must be 3-32 characters."),
  displayName: z
    .union([trimmed.min(2, "Display name must be 2-32 characters.").max(32, "Display name must be 2-32 characters."), z.literal("")])
    .transform((value) => (value === "" ? null : value)),
  avatarAssetId: z
    .union([trimmed.min(1, "Avatar is invalid."), z.literal(""), z.null(), z.undefined()])
    .transform((value) => (typeof value === "string" && value.length > 0 ? value : null)),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: passwordBase,
    confirmNewPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((value) => value.newPassword === value.confirmNewPassword, {
    message: "New passwords do not match.",
    path: ["confirmNewPassword"],
  });

export const changePasswordServerSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: passwordBase,
});

export type UpdateProfileInput = z.input<typeof updateProfileSchema>;
export type UpdateProfileParsed = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.input<typeof changePasswordSchema>;
