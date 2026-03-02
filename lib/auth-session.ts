import { cookies, headers } from "next/headers";
import { getSessionCookieName, getSessionMaxAge, signSession } from "@/lib/session";
import { getCanonicalBaseUrl, isSecureBaseUrl } from "@/src/lib/url";

type SessionUser = {
  id: string;
  role: "USER" | "ADMIN";
  username: string;
  name: string | null;
};

type SetSessionCookieOptions = {
  secure?: boolean;
};

export async function setUserSessionCookie(user: SessionUser, options?: SetSessionCookieOptions) {
  const token = await signSession({
    sub: user.id,
    role: user.role,
    username: user.username,
    name: user.name ?? null,
  });

  const secure =
    options?.secure ??
    isSecureBaseUrl(getCanonicalBaseUrl(await headers()));

  const cookieStore = await cookies();
  cookieStore.set(getSessionCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: getSessionMaxAge(),
  });
}

export async function clearUserSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(getSessionCookieName());
}
