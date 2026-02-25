import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    redirect("/app");
  }
  return user;
}
