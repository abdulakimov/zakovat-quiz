"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { clearUserSessionCookie, setUserSessionCookie } from "@/lib/auth-session";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getPathWithoutLocale, localizeHref, normalizeLocale } from "@/src/i18n/config";
import { consumeRateLimit } from "@/src/lib/rate-limit";
import { signInSchema, signUpSchema, type SignInRawInput, type SignUpRawInput } from "@/src/validators/auth";
import { formatZodError, type FieldErrorMap } from "@/src/validators/zod-error";

export type AuthState = {
  ok?: boolean;
  fieldErrors?: FieldErrorMap;
  formErrorKey?: string;
  successKey?: string;
};

const LOGIN_LIMIT = { bucket: "auth:login", limit: 5, windowMs: 10 * 60 * 1000 };

function toSignupInput(formData: FormData): SignUpRawInput {
  return {
    name: typeof formData.get("name") === "string" ? String(formData.get("name")) : "",
    username: typeof formData.get("username") === "string" ? String(formData.get("username")) : "",
    email: typeof formData.get("email") === "string" ? String(formData.get("email")) : "",
    password: typeof formData.get("password") === "string" ? String(formData.get("password")) : "",
    confirmPassword:
      typeof formData.get("confirmPassword") === "string" ? String(formData.get("confirmPassword")) : "",
  };
}

function toLoginInput(formData: FormData): SignInRawInput {
  return {
    usernameOrEmail:
      typeof formData.get("usernameOrEmail") === "string" ? String(formData.get("usernameOrEmail")) : "",
    password: typeof formData.get("password") === "string" ? String(formData.get("password")) : "",
  };
}

function resolvePostLoginRedirect(rawNext: FormDataEntryValue | null, locale: ReturnType<typeof normalizeLocale>) {
  const fallback = localizeHref(locale, "/app");
  if (typeof rawNext !== "string" || rawNext.length === 0) {
    return fallback;
  }

  try {
    const parsed = new URL(rawNext, "http://localhost");
    if (parsed.origin !== "http://localhost") {
      return fallback;
    }

    const nextPathname = getPathWithoutLocale(parsed.pathname);
    if (!nextPathname.startsWith("/app")) {
      return fallback;
    }

    return `${localizeHref(locale, nextPathname)}${parsed.search}`;
  } catch {
    return fallback;
  }
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

async function getActionLocale() {
  const headerStore = await headers();
  return normalizeLocale(headerStore.get("x-locale"));
}

export async function signup(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const locale = await getActionLocale();

  try {
    const inputResult = signUpSchema.safeParse(toSignupInput(formData));
    if (!inputResult.success) {
      return {
        ok: false,
        fieldErrors: formatZodError(inputResult.error),
        formErrorKey: "auth.validation.invalidInput",
      };
    }

    const input = inputResult.data;
    const existing = await prisma.user.findUnique({ where: { username: input.username } });
    if (existing) {
      logger.warn("Signup rejected: username already taken", { username: input.username });
      return {
        ok: false,
        fieldErrors: { username: "auth.validation.username.taken" },
        formErrorKey: "auth.validation.fixFields",
      };
    }

    const existingEmail = await prisma.user.findUnique({ where: { email: input.email } });
    if (existingEmail) {
      logger.warn("Signup rejected: email already in use", { email: input.email });
      return {
        ok: false,
        fieldErrors: { email: "auth.validation.email.taken" },
        formErrorKey: "auth.validation.fixFields",
      };
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        username: input.username,
        email: input.email,
        name: input.name ?? null,
        passwordHash,
        role: "USER",
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
      },
    });

    await setUserSessionCookie(user);
    redirect(localizeHref(locale, "/app"));
  } catch (error) {
    logger.error("Signup unexpected failure", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function login(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const locale = await getActionLocale();
  const destination = resolvePostLoginRedirect(formData.get("next"), locale);

  try {
    const inputResult = signInSchema.safeParse(toLoginInput(formData));
    if (!inputResult.success) {
      return {
        ok: false,
        fieldErrors: formatZodError(inputResult.error),
        formErrorKey: "auth.validation.invalidInput",
      };
    }

    const input = inputResult.data;
    const clientIp = await getClientIp();
    const rate = consumeRateLimit({
      ...LOGIN_LIMIT,
      key: makeRateLimitKey(clientIp, input.usernameOrEmail),
    });

    if (!rate.ok) {
      logger.warn("Login rate limit exceeded", {
        clientIp,
        identifier: input.usernameOrEmail,
        retryAfterSeconds: rate.retryAfterSeconds,
      });
      return {
        ok: false,
        formErrorKey: "auth.error.tooManyAttempts",
      };
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: input.usernameOrEmail }, { email: input.usernameOrEmail }],
      },
    });

    if (!user || user.status === "DISABLED") {
      logger.warn("Login failed: invalid account", {
        identifier: input.usernameOrEmail,
        hasUser: Boolean(user),
        status: user?.status,
      });
      return {
        ok: false,
        formErrorKey: "auth.error.invalidCredentials",
      };
    }

    const matches = await bcrypt.compare(input.password, user.passwordHash);
    if (!matches) {
      logger.warn("Login failed: password mismatch", { userId: user.id });
      return {
        ok: false,
        formErrorKey: "auth.error.invalidCredentials",
      };
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

    await setUserSessionCookie(user);
    logger.info("Login successful", { userId: user.id });
    redirect(destination);
  } catch (error) {
    logger.error("Login unexpected failure", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function signOut() {
  const locale = await getActionLocale();
  await clearUserSessionCookie();
  logger.info("User signed out");
  redirect(localizeHref(locale, "/auth/login"));
}
