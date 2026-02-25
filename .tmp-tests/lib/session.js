"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionCookieName = getSessionCookieName;
exports.getSessionMaxAge = getSessionMaxAge;
exports.signSession = signSession;
exports.verifySessionToken = verifySessionToken;
const jose_1 = require("jose");
const env_1 = require("@/src/env");
const SESSION_COOKIE_NAME = "zakovat_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const encodedSecret = new TextEncoder().encode((0, env_1.getSessionEnv)().SESSION_SECRET);
function getSessionCookieName() {
    return SESSION_COOKIE_NAME;
}
function getSessionMaxAge() {
    return SESSION_TTL_SECONDS;
}
async function signSession(payload) {
    return new jose_1.SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
        .sign(encodedSecret);
}
async function verifySessionToken(token) {
    try {
        const { payload } = await (0, jose_1.jwtVerify)(token, encodedSecret);
        return payload;
    }
    catch (_a) {
        return null;
    }
}
