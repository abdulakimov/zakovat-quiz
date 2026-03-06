import { getTranslations } from "@/src/i18n/server";
import { TelegramIcon } from "@/src/components/icons/TelegramIcon";
import { GoogleIcon } from "@/src/components/icons/GoogleIcon";
import { Button } from "@/components/ui/button";

type QrPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function providerHref(path: string, token: string) {
  const nextPath = `/auth/qr/finish?t=${encodeURIComponent(token)}`;
  return `${path}?next=${encodeURIComponent(nextPath)}`;
}

export default async function QrEntryPage({ searchParams }: QrPageProps) {
  const tAuth = await getTranslations("auth");
  const params = await searchParams;
  const token = firstParam(params.t).trim();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
      <section className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">{tAuth("qr.mobile.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{tAuth("qr.mobile.subtitle")}</p>

        {!token ? (
          <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {tAuth("qr.mobile.invalidToken")}
          </p>
        ) : (
          <div className="mt-6 space-y-3">
            <Button asChild className="h-11 w-full" data-testid="qr-mobile-telegram">
              <a href={providerHref("/auth/telegram/start", token)} className="flex items-center justify-center gap-2">
                <TelegramIcon />
                <span>{tAuth("actions.continueWithTelegram")}</span>
              </a>
            </Button>
            <Button asChild variant="outline" className="h-11 w-full" data-testid="qr-mobile-google">
              <a href={providerHref("/auth/google/start", token)} className="flex items-center justify-center gap-2">
                <GoogleIcon />
                <span>{tAuth("actions.continueWithGoogle")}</span>
              </a>
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}
