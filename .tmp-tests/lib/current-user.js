"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentUser = getCurrentUser;
const headers_1 = require("next/headers");
const prisma_1 = require("@/lib/prisma");
const session_1 = require("@/lib/session");
async function getCurrentUser() {
    var _a;
    const cookieStore = await (0, headers_1.cookies)();
    const token = (_a = cookieStore.get((0, session_1.getSessionCookieName)())) === null || _a === void 0 ? void 0 : _a.value;
    if (!token) {
        return null;
    }
    const session = await (0, session_1.verifySessionToken)(token);
    if (!session) {
        return null;
    }
    return prisma_1.prisma.user.findUnique({
        where: { id: session.sub },
        select: {
            id: true,
            username: true,
            name: true,
            email: true,
            displayName: true,
            avatarAssetId: true,
            avatarAsset: {
                select: {
                    id: true,
                    path: true,
                },
            },
            role: true,
        },
    });
}
