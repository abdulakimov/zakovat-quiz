"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { consumeRateLimit } from "@/src/lib/rate-limit";
import { safeAction } from "@/src/lib/actions";
import { loginSchema, signupSchema } from "@/src/schemas/auth";
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


async function setSessionCookie(user: {
  id: string;
  role: "USER" | "ADMIN";
  username: string;
  name: string | null;
}) {
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
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
      },
    });

    await setSessionCookie(user);
    redirect("/app");
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

    if (user.status === "DISABLED") {
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

    if (user.status === "PENDING_VERIFICATION") {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          status: "ACTIVE",
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        },
      });
    }

    await setSessionCookie(user);

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
