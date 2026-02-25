import { SignJWT, jwtVerify } from "jose";
import { getSessionEnv } from "@/src/env";

const SESSION_COOKIE_NAME = "zakovat_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const encodedSecret = new TextEncoder().encode(getSessionEnv().SESSION_SECRET);

export type SessionPayload = {
  sub: string;
  role: "USER" | "ADMIN";
  username: string;
  name: string | null;
};

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}

export function getSessionMaxAge() {
  return SESSION_TTL_SECONDS;
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(encodedSecret);
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, encodedSecret);
    return payload;
  } catch {
    return null;
  }
}
