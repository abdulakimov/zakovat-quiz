"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signInSchema = exports.displayNameSchema = exports.passwordSchema = exports.usernameSchema = exports.emailSchema = void 0;
const zod_1 = require("zod");
const EMAIL_MAX = 254;
const USERNAME_MIN = 3;
const USERNAME_MAX = 24;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;
const NAME_MIN = 2;
const NAME_MAX = 64;
const usernameAllowedRegex = /^[a-z0-9._]+$/;
const nameAllowedRegex = /^[\p{L}\p{M}' -]+$/u;
exports.emailSchema = zod_1.z
    .string()
    .trim()
    .min(1, "auth.validation.email.required")
    .max(EMAIL_MAX, "auth.validation.email.tooLong")
    .toLowerCase()
    .email("auth.validation.email.invalid");
exports.usernameSchema = zod_1.z
    .string()
    .trim()
    .toLowerCase()
    .min(USERNAME_MIN, "auth.validation.username.tooShort")
    .max(USERNAME_MAX, "auth.validation.username.tooLong")
    .regex(usernameAllowedRegex, "auth.validation.username.invalid")
    .refine((value) => !value.startsWith(".") && !value.startsWith("_"), "auth.validation.username.invalidEdge")
    .refine((value) => !value.endsWith(".") && !value.endsWith("_"), "auth.validation.username.invalidEdge")
    .refine((value) => !value.includes("..") && !value.includes("__"), "auth.validation.username.consecutive");
exports.passwordSchema = zod_1.z
    .string()
    .min(PASSWORD_MIN, "auth.validation.password.tooShort")
    .max(PASSWORD_MAX, "auth.validation.password.tooLong")
    .refine((value) => value.trim() === value, "auth.validation.password.edgeSpaces")
    .refine((value) => /[A-Za-z]/.test(value), "auth.validation.password.missingLetter")
    .refine((value) => /\d/.test(value), "auth.validation.password.missingNumber");
exports.displayNameSchema = zod_1.z
    .string()
    .trim()
    .min(NAME_MIN, "auth.validation.name.tooShort")
    .max(NAME_MAX, "auth.validation.name.tooLong")
    .regex(nameAllowedRegex, "auth.validation.name.invalid");
const usernameOrEmailSchema = zod_1.z
    .string()
    .trim()
    .min(1, "auth.validation.identifier.required")
    .transform((value) => value.toLowerCase())
    .superRefine((value, ctx) => {
    var _a, _b;
    if (value.includes("@")) {
        const result = exports.emailSchema.safeParse(value);
        if (!result.success) {
            const issue = result.error.issues[0];
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: (_a = issue === null || issue === void 0 ? void 0 : issue.message) !== null && _a !== void 0 ? _a : "auth.validation.identifier.invalid",
            });
        }
        return;
    }
    const result = exports.usernameSchema.safeParse(value);
    if (!result.success) {
        const issue = result.error.issues[0];
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: (_b = issue === null || issue === void 0 ? void 0 : issue.message) !== null && _b !== void 0 ? _b : "auth.validation.identifier.invalid",
        });
    }
});
exports.signInSchema = zod_1.z.object({
    usernameOrEmail: usernameOrEmailSchema,
    password: exports.passwordSchema,
});
