import { z } from "zod";

const nonEmpty = z.string().trim().min(1);

const prismaSchema = z.object({
  DATABASE_URL: nonEmpty,
});

const sessionSchema = z.object({
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters."),
});

const appSchema = prismaSchema.merge(sessionSchema);

function formatEnvError(scope: string, error: z.ZodError) {
  const issues = error.issues
    .map((issue) => {
      const path = issue.path.join(".") || "(root)";
      return `- ${path}: ${issue.message}`;
    })
    .join("\n");

  return `Invalid environment configuration (${scope}).\n${issues}`;
}

function parseEnv<T extends z.ZodTypeAny>(scope: string, schema: T): z.infer<T> {
  const result = schema.safeParse(process.env);
  if (result.success) {
    return result.data;
  }

  const message = formatEnvError(scope, result.error);

  if (process.env.NODE_ENV !== "production") {
    throw new Error(message);
  }

  throw new Error(`Environment configuration is invalid (${scope}).`);
}

let prismaEnvCache: z.infer<typeof prismaSchema> | null = null;
let sessionEnvCache: z.infer<typeof sessionSchema> | null = null;
let appEnvCache: z.infer<typeof appSchema> | null = null;

export function getPrismaEnv() {
  prismaEnvCache ??= parseEnv("prisma", prismaSchema);
  return prismaEnvCache;
}

export function getSessionEnv() {
  sessionEnvCache ??= parseEnv("session", sessionSchema);
  return sessionEnvCache;
}

export function getAppEnv() {
  appEnvCache ??= parseEnv("app", appSchema);
  return appEnvCache;
}
