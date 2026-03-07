import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/current-user";
import { LanguageSwitcher } from "@/src/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/src/components/theme/ThemeSwitcher";
import { localizeHref, type AppLocale } from "@/src/i18n/config";

export default async function HomePage() {
  const [locale, tLanding, user] = await Promise.all([
    getLocale(),
    getTranslations("landing"),
    getCurrentUser(),
  ]);
  const activeLocale = locale as AppLocale;

  const featureKeys = ["featureOne", "featureTwo", "featureThree", "featureFour"] as const;
  const stepKeys = ["stepOne", "stepTwo", "stepThree"] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold tracking-tight">{tLanding("brand")}</p>
            <p className="text-xs text-muted-foreground">{tLanding("brandTagline")}</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-border">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background" />
          <div className="relative mx-auto grid w-full max-w-6xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-[1.25fr_1fr] md:py-24">
            <div className="space-y-6">
              <p className="inline-flex rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                {tLanding("heroEyebrow")}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl" data-testid="landing-title">
                {tLanding("heroTitle")}
              </h1>
              <p className="max-w-xl text-base text-muted-foreground sm:text-lg">{tLanding("heroDescription")}</p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" data-testid="cta-signup">
                  <Link href={localizeHref(activeLocale, "/auth/signup")}>{tLanding("ctaStartFree")}</Link>
                </Button>
                <Button asChild size="lg" variant="outline" data-testid="cta-login">
                  <Link href={localizeHref(activeLocale, "/auth/login")}>{tLanding("ctaLogIn")}</Link>
                </Button>
                {user ? (
                  <Button asChild size="lg" variant="default" data-testid="cta-dashboard">
                    <Link href={localizeHref(activeLocale, "/app")}>{tLanding("ctaDashboard")}</Link>
                  </Button>
                ) : null}
              </div>
            </div>
            <Card className="border-border bg-card/80">
              <CardHeader>
                <CardTitle className="text-base">{tLanding("heroPanelTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>{tLanding("heroPanelLineOne")}</p>
                <p>{tLanding("heroPanelLineTwo")}</p>
                <p>{tLanding("heroPanelLineThree")}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight">{tLanding("featuresTitle")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{tLanding("featuresDescription")}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {featureKeys.map((key) => (
              <Card key={key} className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{tLanding(`${key}.title`)}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{tLanding(`${key}.description`)}</CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-card/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold tracking-tight">{tLanding("howTitle")}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{tLanding("howDescription")}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {stepKeys.map((key, index) => (
                <Card key={key} className="border-border bg-background">
                  <CardHeader className="pb-2">
                    <p className="text-sm text-muted-foreground">{tLanding("stepLabel", { number: index + 1 })}</p>
                    <CardTitle className="text-base">{tLanding(`${key}.title`)}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">{tLanding(`${key}.description`)}</CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-6 text-xs text-muted-foreground sm:px-6">
        <p>{tLanding("footerNote")}</p>
        <p>{tLanding("footerSupport")}</p>
      </footer>
    </div>
  );
}
