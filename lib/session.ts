import { SignJWT, jwtVerify } from "jose";
import { getSessionEnv } from "@/src/env";

const SESSION_COOKIE_NAME = "zakovat_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

let encodedSecret: Uint8Array | null = null;

function getEncodedSecret() {
  if (!encodedSecret) {
    encodedSecret = new TextEncoder().encode(getSessionEnv().SESSION_SECRET);
  }
  return encodedSecret;
}

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
    .sign(getEncodedSecret());
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, getEncodedSecret());
    return payload;
  } catch {
    return null;
  }
}
