import { cookies } from "next/headers";
import { getSessionCookieName, getSessionMaxAge, signSession } from "@/lib/session";

type SessionUser = {
  id: string;
  role: "USER" | "ADMIN";
  username: string;
  name: string | null;
};

export async function setUserSessionCookie(user: SessionUser) {
  const token = await signSession({
    sub: user.id,
    role: user.role,
    username: user.username,
    name: user.name ?? null,
  });

  const cookieStore = await cookies();
  cookieStore.set(getSessionCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getSessionMaxAge(),
  });
}

export async function clearUserSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(getSessionCookieName());
}
