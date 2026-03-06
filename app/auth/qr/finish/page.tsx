import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { getTranslations } from "@/src/i18n/server";
import { hashQrToken, isQrExpired, QR_TOKEN_COOKIE } from "@/src/lib/qr-login";
import { normalizeLocale, localizeHref } from "@/src/i18n/config";

type QrFinishPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

export default async function QrFinishPage({ searchParams }: QrFinishPageProps) {
  const tAuth = await getTranslations("auth");
  const user = await getCurrentUser();
  if (!user) {
    const locale = normalizeLocale((await cookies()).get("NEXT_LOCALE")?.value);
    redirect(localizeHref(locale, "/auth/login"));
  }

  const params = await searchParams;
  const cookieStore = await cookies();
  const rawToken = firstParam(params.t).trim() || cookieStore.get(QR_TOKEN_COOKIE)?.value || "";
  if (!rawToken) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
        <section className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-foreground">{tAuth("qr.finish.invalidTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{tAuth("qr.finish.invalidSubtitle")}</p>
        </section>
      </main>
    );
  }

  const tokenHash = hashQrToken(rawToken);
  const session = await prisma.qrLoginSession.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      status: true,
      expiresAt: true,
    },
  });
  if (!session || isQrExpired(session.expiresAt) || session.status === "EXPIRED") {
    if (session && session.status !== "EXPIRED") {
      await prisma.qrLoginSession.update({
        where: { id: session.id },
        data: { status: "EXPIRED" },
      });
    }

    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
        <section className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-foreground">{tAuth("qr.finish.expiredTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{tAuth("qr.finish.expiredSubtitle")}</p>
        </section>
      </main>
    );
  }

  if (session.status === "PENDING") {
    await prisma.qrLoginSession.update({
      where: { id: session.id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedUserId: user.id,
      },
    });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
      <section className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-foreground" data-testid="qr-finish-approved-title">
          {tAuth("qr.finish.approvedTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{tAuth("qr.finish.approvedSubtitle")}</p>
      </section>
    </main>
  );
}
