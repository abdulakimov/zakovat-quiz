"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRhfZodResolverTests = runRhfZodResolverTests;
const strict_1 = __importDefault(require("node:assert/strict"));
const auth_1 = require("./auth");
const rhf_zod_1 = require("./rhf-zod");
async function runRhfZodResolverTests() {
    var _a, _b;
    const resolver = (0, rhf_zod_1.zodResolverCompat)(auth_1.signInSchema);
    const result = await resolver({
        usernameOrEmail: "",
        password: "",
    }, {}, {
        criteriaMode: "firstError",
        names: [],
        fields: {},
        shouldUseNativeValidation: false,
    });
    strict_1.default.equal(result.values && Object.keys(result.values).length > 0, false);
    strict_1.default.equal((_a = result.errors.usernameOrEmail) === null || _a === void 0 ? void 0 : _a.message, "auth.validation.identifier.required");
    strict_1.default.equal((_b = result.errors.password) === null || _b === void 0 ? void 0 : _b.message, "auth.validation.password.tooShort");
}
