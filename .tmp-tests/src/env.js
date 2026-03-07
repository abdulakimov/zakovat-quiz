"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPrismaEnv = getPrismaEnv;
exports.getSessionEnv = getSessionEnv;
exports.getEmailEnv = getEmailEnv;
exports.getAppEnv = getAppEnv;
const zod_1 = require("zod");
const nonEmpty = zod_1.z.string().trim().min(1);
const prismaSchema = zod_1.z.object({
    DATABASE_URL: nonEmpty,
});
const sessionSchema = zod_1.z.object({
    SESSION_SECRET: zod_1.z.string().min(32, "SESSION_SECRET must be at least 32 characters."),
});
const emailSchema = zod_1.z.object({
    SMTP_HOST: nonEmpty,
    SMTP_PORT: zod_1.z.coerce.number().int().min(1).max(65535),
    SMTP_USER: nonEmpty,
    SMTP_PASS: nonEmpty,
    SMTP_FROM: nonEmpty,
    APP_URL: zod_1.z.string().url(),
});
const appSchema = prismaSchema.merge(sessionSchema).merge(emailSchema);
function formatEnvError(scope, error) {
    const issues = error.issues
        .map((issue) => {
        const path = issue.path.join(".") || "(root)";
        return `- ${path}: ${issue.message}`;
    })
        .join("\n");
    return `Invalid environment configuration (${scope}).\n${issues}`;
}
function parseEnv(scope, schema) {
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
let prismaEnvCache = null;
let sessionEnvCache = null;
let emailEnvCache = null;
let appEnvCache = null;
function getPrismaEnv() {
    prismaEnvCache !== null && prismaEnvCache !== void 0 ? prismaEnvCache : (prismaEnvCache = parseEnv("prisma", prismaSchema));
    return prismaEnvCache;
}
function getSessionEnv() {
    sessionEnvCache !== null && sessionEnvCache !== void 0 ? sessionEnvCache : (sessionEnvCache = parseEnv("session", sessionSchema));
    return sessionEnvCache;
}
function getEmailEnv() {
    emailEnvCache !== null && emailEnvCache !== void 0 ? emailEnvCache : (emailEnvCache = parseEnv("email", emailSchema));
    return emailEnvCache;
}
function getAppEnv() {
    appEnvCache !== null && appEnvCache !== void 0 ? appEnvCache : (appEnvCache = parseEnv("app", appSchema));
    return appEnvCache;
}
