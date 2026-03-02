import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DashboardStat = {
  label: string;
  value: string;
  hint: string;
};

type QuickAction = {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  testId?: string;
};

type RecentPack = {
  id: string;
  href: string;
  title: string;
  updatedAtLabel: string;
  roundsLabel: string;
  visibilityLabel: string;
};

type AppDashboardProps = {
  title: string;
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  stats: DashboardStat[];
  quickActionsTitle: string;
  quickActionsDescription: string;
  quickActions: QuickAction[];
  recentTitle: string;
  recentDescription: string;
  recentPacks: RecentPack[];
  emptyRecentTitle: string;
  emptyRecentDescription: string;
  openLabel: string;
};

export function AppDashboard({
  title,
  description,
  primaryCta,
  secondaryCta,
  stats,
  quickActionsTitle,
  quickActionsDescription,
  quickActions,
  recentTitle,
  recentDescription,
  recentPacks,
  emptyRecentTitle,
  emptyRecentDescription,
  openLabel,
}: AppDashboardProps) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <section className="overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/10 via-card to-card">
        <div className="grid gap-6 p-6 md:p-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <div className="space-y-5">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl" data-testid="app-heading">
                {title}
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{description}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={primaryCta.href}>{primaryCta.label}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
              </Button>
            </div>
          </div>

          <div className="grid w-full gap-3 lg:justify-self-end">
            {stats.map((stat) => (
              <Card key={stat.label} className="rounded-xl border border-border bg-card transition hover:shadow-md">
                <CardHeader className="space-y-1 pb-2">
                  <CardDescription>{stat.label}</CardDescription>
                  <CardTitle className="text-2xl">{stat.value}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-muted-foreground">{stat.hint}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{quickActionsTitle}</h2>
          <p className="text-sm text-muted-foreground">{quickActionsDescription}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              data-testid={action.testId}
              className="group rounded-xl border border-border bg-card p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-3 inline-flex rounded-lg border border-border bg-background p-2 text-muted-foreground transition group-hover:text-foreground">
                {action.icon}
              </div>
              <p className="text-sm font-semibold text-foreground">{action.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{recentTitle}</h2>
          <p className="text-sm text-muted-foreground">{recentDescription}</p>
        </div>
        <Card className="rounded-xl border border-border bg-card">
          <CardContent className="p-0">
            {recentPacks.length > 0 ? (
              <ul className="divide-y divide-border">
                {recentPacks.map((pack) => (
                  <li key={pack.id}>
                    <Link
                      href={pack.href}
                      className="flex flex-col gap-3 p-4 transition hover:bg-accent/40 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="truncate text-sm font-semibold text-foreground">{pack.title}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{pack.updatedAtLabel}</span>
                          <span aria-hidden>•</span>
                          <span>{pack.roundsLabel}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <Badge variant="secondary">{pack.visibilityLabel}</Badge>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                          {openLabel}
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="space-y-1 p-6 text-center">
                <p className="text-sm font-semibold text-foreground">{emptyRecentTitle}</p>
                <p className="text-sm text-muted-foreground">{emptyRecentDescription}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
