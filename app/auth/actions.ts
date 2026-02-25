"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { consumeRateLimit } from "@/src/lib/rate-limit";
import { safeAction } from "@/src/lib/actions";
import {
  loginSchema,
  resendVerificationSchema,
  signupSchema,
  verifySchema,
} from "@/src/schemas/auth";
import {
  getSessionCookieName,
  getSessionMaxAge,
  signSession,
} from "@/lib/session";

export type AuthState = {
  error?: string;
  success?: string;
};

const LOGIN_LIMIT = { bucket: "auth:login", limit: 5, windowMs: 10 * 60 * 1000 };
const VERIFY_LIMIT = { bucket: "auth:verify", limit: 10, windowMs: 10 * 60 * 1000 };
const RESEND_LIMIT = { bucket: "auth:resend", limit: 5, windowMs: 10 * 60 * 1000 };

function normalizeUsername(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeName(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeEmail(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function toSignupInput(formData: FormData) {
  return {
    username: normalizeUsername(formData.get("username")),
    name: typeof formData.get("name") === "string" ? String(formData.get("name")) : "",
    email: normalizeEmail(formData.get("email")),
    password: typeof formData.get("password") === "string" ? String(formData.get("password")) : "",
  };
}

function toLoginInput(formData: FormData) {
  return {
    usernameOrEmail: normalizeUsername(formData.get("usernameOrEmail")),
    password: typeof formData.get("password") === "string" ? String(formData.get("password")) : "",
  };
}

function toVerifyInput(formData: FormData) {
  return {
    email: normalizeEmail(formData.get("email")),
    code: typeof formData.get("code") === "string" ? String(formData.get("code")).trim() : "",
  };
}

function toResendVerificationInput(formData: FormData) {
  return {
    email: normalizeEmail(formData.get("email")),
  };
}

function toAuthError(resultError: string, fieldErrors?: Record<string, string[] | undefined>): string {
  const firstFieldError = Object.values(fieldErrors ?? {}).flat().find(Boolean);
  return firstFieldError ?? resultError;
}

async function getClientIp() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  const realIp = h.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

function makeRateLimitKey(ip: string, identifier: string) {
  return `${ip}:${identifier || "unknown"}`;
}

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function upsertVerification(userId: string) {
  const now = new Date();
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

  const existing = await prisma.emailVerificationCode.findUnique({
    where: { userId },
  });

  if (existing) {
    const hoursSinceCreated =
      (now.getTime() - existing.createdAt.getTime()) / (1000 * 60 * 60);
    const shouldReset = hoursSinceCreated >= 24;
    const sendCount = shouldReset ? 1 : existing.sendCount + 1;
    const attempts = shouldReset ? 0 : existing.attempts;

    await prisma.emailVerificationCode.update({
      where: { userId },
      data: {
        codeHash,
        expiresAt,
        attempts,
        sendCount,
        lastSentAt: now,
        createdAt: shouldReset ? now : existing.createdAt,
      },
    });
  } else {
    await prisma.emailVerificationCode.create({
      data: {
        userId,
        codeHash,
        expiresAt,
        attempts: 0,
        sendCount: 1,
        lastSentAt: now,
      },
    });
  }

  return code;
}

export async function signup(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const execute = safeAction(signupSchema, async (input) => {
    const username = input.username.toLowerCase();
    const name = normalizeName(input.name ?? null);
    const email = input.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      logger.warn("Signup rejected: username already taken", { username });
      return { error: "Username is already taken." } satisfies AuthState;
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      logger.warn("Signup rejected: email already in use", { email });
      return { error: "Unable to create account with the provided details." } satisfies AuthState;
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        name,
        passwordHash,
        role: "USER",
        status: "PENDING_VERIFICATION",
      },
    });

    const code = await upsertVerification(user.id);
    try {
      await sendVerificationEmail(user.email, code);
      logger.info("Signup verification email sent", {
        userId: user.id,
        email: user.email,
      });
    } catch (error) {
      try {
        // Avoid leaving orphaned pending accounts when email delivery fails.
        await prisma.user.delete({ where: { id: user.id } });
      } catch (cleanupError) {
        logger.error("Failed to cleanup pending user after email send failure", {
          userId: user.id,
          email: user.email,
          cleanupError,
        });
      }

      logger.error("Failed to send verification email", {
        userId: user.id,
        email: user.email,
        error,
      });
      return { error: "Failed to send verification email." } satisfies AuthState;
    }

    redirect(`/auth/verify?email=${encodeURIComponent(user.email)}`);
  });

  const result = await execute(toSignupInput(formData));
  if (!result.ok) {
    return { error: toAuthError(result.error, result.fieldErrors) };
  }

  return result.data ?? {};
}

export async function login(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const clientIp = await getClientIp();
  const execute = safeAction(loginSchema, async (input) => {
    const identifier = input.usernameOrEmail.toLowerCase();
    const rate = consumeRateLimit({
      ...LOGIN_LIMIT,
      key: makeRateLimitKey(clientIp, identifier),
    });
    if (!rate.ok) {
      logger.warn("Login rate limit exceeded", {
        clientIp,
        identifier,
        retryAfterSeconds: rate.retryAfterSeconds,
      });
      return { error: "Too many attempts. Please try again later." } satisfies AuthState;
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: identifier }, { email: identifier }],
      },
    });
    if (!user) {
      logger.warn("Login failed: user not found", { identifier });
      return { error: "Invalid username or password." } satisfies AuthState;
    }

    if (user.status !== "ACTIVE") {
      logger.warn("Login blocked: user not active", {
        userId: user.id,
        status: user.status,
      });
      return { error: "Invalid username or password." } satisfies AuthState;
    }

    const matches = await bcrypt.compare(input.password, user.passwordHash);
    if (!matches) {
      logger.warn("Login failed: password mismatch", { userId: user.id });
      return { error: "Invalid username or password." } satisfies AuthState;
    }

    const token = await signSession({
      sub: user.id,
      role: user.role,
      username: user.username,
      name: user.name ?? null,
    });

    const cookieStore = await cookies();
    cookieStore.set(getSessionCookieName(), token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: getSessionMaxAge(),
    });

    logger.info("Login successful", { userId: user.id });
    redirect("/app");
  });

  const result = await execute(toLoginInput(formData));
  if (!result.ok) {
    return { error: toAuthError(result.error, result.fieldErrors) };
  }

  return result.data ?? {};
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(getSessionCookieName());
  logger.info("User signed out");
  redirect("/auth/login");
}

export async function verifyEmail(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const clientIp = await getClientIp();
  const execute = safeAction(verifySchema, async (input) => {
    const email = input.email.toLowerCase();
    const code = input.code.trim();
    const rate = consumeRateLimit({
      ...VERIFY_LIMIT,
      key: makeRateLimitKey(clientIp, email),
    });
    if (!rate.ok) {
      logger.warn("Verification rate limit exceeded", {
        clientIp,
        email,
        retryAfterSeconds: rate.retryAfterSeconds,
      });
      return { error: "Too many attempts. Please try again later." } satisfies AuthState;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { error: "Invalid or expired verification code." } satisfies AuthState;
    }

    const verification = await prisma.emailVerificationCode.findUnique({
      where: { userId: user.id },
    });

    if (!verification) {
      return { error: "Invalid or expired verification code." } satisfies AuthState;
    }

    if (verification.attempts >= 5) {
      return { error: "Invalid or expired verification code." } satisfies AuthState;
    }

    if (verification.expiresAt < new Date()) {
      return { error: "Invalid or expired verification code." } satisfies AuthState;
    }

    const matches = await bcrypt.compare(code, verification.codeHash);
    if (!matches) {
      await prisma.emailVerificationCode.update({
        where: { userId: user.id },
        data: { attempts: verification.attempts + 1 },
      });
      logger.warn("Email verification failed: invalid code", { userId: user.id });
      return { error: "Invalid code." } satisfies AuthState;
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { status: "ACTIVE", emailVerifiedAt: new Date() },
      }),
      prisma.emailVerificationCode.delete({ where: { userId: user.id } }),
    ]);

    logger.info("Email verified", { userId: user.id });
    redirect("/auth/login");
  });

  const result = await execute(toVerifyInput(formData));
  if (!result.ok) {
    return { error: toAuthError(result.error, result.fieldErrors) };
  }

  return result.data;
}

export async function resendVerification(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const clientIp = await getClientIp();
  const execute = safeAction(resendVerificationSchema, async (input) => {
    const email = input.email.toLowerCase();
    const rate = consumeRateLimit({
      ...RESEND_LIMIT,
      key: makeRateLimitKey(clientIp, email),
    });
    if (!rate.ok) {
      logger.warn("Resend verification rate limit exceeded", {
        clientIp,
        email,
        retryAfterSeconds: rate.retryAfterSeconds,
      });
      return { error: "Too many attempts. Please try again later." } satisfies AuthState;
    }

    const genericResendSuccess = {
      success: "If the email is eligible, a verification code will be sent.",
    } satisfies AuthState;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return genericResendSuccess;
    }

    if (user.status === "ACTIVE") {
      return genericResendSuccess;
    }

    const existing = await prisma.emailVerificationCode.findUnique({
      where: { userId: user.id },
    });

    const now = new Date();
    if (existing?.lastSentAt) {
      const secondsSinceLast =
        (now.getTime() - existing.lastSentAt.getTime()) / 1000;
      if (secondsSinceLast < 60) {
        return genericResendSuccess;
      }
    }

    if (existing?.sendCount && existing.sendCount >= 10) {
      return genericResendSuccess;
    }

    const code = await upsertVerification(user.id);
    try {
      await sendVerificationEmail(user.email, code);
      logger.info("Verification email resent", { userId: user.id, email: user.email });
    } catch (error) {
      logger.error("Failed to resend verification email", {
        userId: user.id,
        email: user.email,
        error,
      });
      return { error: "Failed to send verification email." } satisfies AuthState;
    }

    return genericResendSuccess;
  });

  const result = await execute(toResendVerificationInput(formData));
  if (!result.ok) {
    return { error: toAuthError(result.error, result.fieldErrors) };
  }

  return result.data;
}
