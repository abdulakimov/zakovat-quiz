import type { ReactNode } from "react";
import { ShieldCheck, Sparkles, Zap } from "lucide-react";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  benefits: [string, string, string];
  privacyNote: string;
  children: ReactNode;
};

const benefitIcons = [Zap, Sparkles, ShieldCheck] as const;

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  benefits,
  privacyNote,
  children,
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-background bg-gradient-to-b from-background via-background to-primary/5">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <section
            className="hidden rounded-2xl border border-border bg-card/50 p-8 backdrop-blur lg:block"
            data-testid="auth-benefits-panel"
          >
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
            <h1 className="mt-4 text-2xl font-semibold text-foreground">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{subtitle}</p>
            <ul className="mt-6 space-y-3">
              {benefits.map((benefit, index) => {
                const Icon = benefitIcons[index];
                return (
                  <li key={benefit} className="flex items-start gap-3 text-sm text-foreground">
                    <span className="mt-0.5 rounded-md bg-primary/10 p-1 text-primary">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span>{benefit}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-6 text-xs text-muted-foreground">{privacyNote}</p>
          </section>
          <section className="rounded-2xl border border-border bg-card p-8 shadow-sm" data-testid="auth-form-panel">
            <header className="mb-6 space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </header>
            {children}
          </section>
        </div>
      </div>
    </div>
  );
}
