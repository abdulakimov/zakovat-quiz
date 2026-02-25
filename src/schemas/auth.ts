import { z } from "zod";

const trimmed = z.string().trim();

const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{10,}$/;

export const signupSchema = z.object({
  name: trimmed.max(100, "Name is too long.").optional().or(z.literal("")),
  username: trimmed
    .min(3, "Username must be 3-30 characters.")
    .max(30, "Username must be 3-30 characters.")
    .regex(usernameRegex, "Username can include letters, numbers, underscores, and dashes."),
  email: trimmed.email("Please provide a valid email."),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters.")
    .regex(passwordRegex, "Password must include at least 1 letter and 1 number."),
});

export const loginSchema = z.object({
  usernameOrEmail: trimmed.min(1, "Username or email is required."),
  password: z.string().min(1, "Password is required."),
});

export const verifySchema = z.object({
  email: trimmed.email("Please provide a valid email."),
  code: trimmed.regex(/^\d{6}$/, "Verification code must be 6 digits."),
});

export const resendVerificationSchema = verifySchema.pick({
  email: true,
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyInput = z.infer<typeof verifySchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
