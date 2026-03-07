"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAuthSchemaTests = runAuthSchemaTests;
const strict_1 = __importDefault(require("node:assert/strict"));
const auth_1 = require("./auth");
function runAuthSchemaTests() {
    var _a, _b, _c, _d, _e, _f;
    const validSignIn = auth_1.signInSchema.safeParse({
        usernameOrEmail: "User.Name",
        password: "abc12345",
    });
    strict_1.default.equal(validSignIn.success, true);
    if (validSignIn.success) {
        strict_1.default.equal(validSignIn.data.usernameOrEmail, "user.name");
    }
    const invalidEmail = auth_1.signInSchema.safeParse({
        usernameOrEmail: "not-an-email@",
        password: "abc12345",
    });
    strict_1.default.equal(invalidEmail.success, false);
    if (!invalidEmail.success) {
        strict_1.default.equal((_a = invalidEmail.error.issues[0]) === null || _a === void 0 ? void 0 : _a.message, "auth.validation.email.invalid");
    }
    const shortPassword = auth_1.signInSchema.safeParse({
        usernameOrEmail: "user@example.com",
        password: "abc1234",
    });
    strict_1.default.equal(shortPassword.success, false);
    if (!shortPassword.success) {
        strict_1.default.equal((_b = shortPassword.error.issues[0]) === null || _b === void 0 ? void 0 : _b.message, "auth.validation.password.tooShort");
    }
    const longPassword = auth_1.signInSchema.safeParse({
        usernameOrEmail: "user@example.com",
        password: `a${"1".repeat(72)}`,
    });
    strict_1.default.equal(longPassword.success, false);
    if (!longPassword.success) {
        strict_1.default.equal((_c = longPassword.error.issues[0]) === null || _c === void 0 ? void 0 : _c.message, "auth.validation.password.tooLong");
    }
    const missingLetter = auth_1.signInSchema.safeParse({
        usernameOrEmail: "user@example.com",
        password: "12345678",
    });
    strict_1.default.equal(missingLetter.success, false);
    if (!missingLetter.success) {
        strict_1.default.equal((_d = missingLetter.error.issues[0]) === null || _d === void 0 ? void 0 : _d.message, "auth.validation.password.missingLetter");
    }
    const missingNumber = auth_1.signInSchema.safeParse({
        usernameOrEmail: "user@example.com",
        password: "abcdefgh",
    });
    strict_1.default.equal(missingNumber.success, false);
    if (!missingNumber.success) {
        strict_1.default.equal((_e = missingNumber.error.issues[0]) === null || _e === void 0 ? void 0 : _e.message, "auth.validation.password.missingNumber");
    }
    const invalidIdentifier = auth_1.signInSchema.safeParse({
        usernameOrEmail: "__invalid",
        password: "abc12345",
    });
    strict_1.default.equal(invalidIdentifier.success, false);
    if (!invalidIdentifier.success) {
        strict_1.default.equal((_f = invalidIdentifier.error.issues[0]) === null || _f === void 0 ? void 0 : _f.message, "auth.validation.username.invalidEdge");
    }
}
