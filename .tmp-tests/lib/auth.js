"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireUser = requireUser;
exports.requireAdmin = requireAdmin;
const navigation_1 = require("next/navigation");
const current_user_1 = require("@/lib/current-user");
async function requireUser() {
    const user = await (0, current_user_1.getCurrentUser)();
    if (!user) {
        (0, navigation_1.redirect)("/auth/login");
    }
    return user;
}
async function requireAdmin() {
    const user = await requireUser();
    if (user.role !== "ADMIN") {
        (0, navigation_1.redirect)("/app");
    }
    return user;
}
