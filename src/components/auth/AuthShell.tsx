import type { ReactNode } from "react";
import { AuthBackground } from "@/src/components/auth/AuthBackground";

type AuthShellProps = {
  title: string;
  subtitle: string;
  visualTitle: string;
  visualSubtitle: string;
  visualHelper: string;
  children: ReactNode;
};

export function AuthShell({
  title,
  subtitle,
  visualTitle,
  visualSubtitle,
  visualHelper,
  children,
}: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-y-auto bg-background py-10">
      <AuthBackground />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-5xl items-start justify-center px-4 lg:items-center">
        <div className="w-full rounded-3xl border border-border bg-card p-4 shadow-sm md:p-6 dark:shadow-none lg:max-h-[calc(100vh-96px)]">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
            <section className="rounded-2xl border border-border/80 bg-card p-6 pb-6 md:p-8 lg:overflow-y-auto lg:pr-2" data-testid="auth-form-panel">
              <header className="mb-6 space-y-2">
                <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              </header>
              {children}
            </section>
            <section
              className="rounded-2xl border border-border/70 bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4 sm:p-6 lg:flex lg:flex-col lg:items-center lg:justify-center"
              data-testid="auth-visual-panel"
            >
              <div className="w-full max-w-sm rounded-2xl border border-border/80 bg-card p-5 shadow-sm dark:shadow-none">
                <div className="mx-auto grid h-28 w-28 grid-cols-8 gap-1 rounded-xl border border-border bg-background p-2 sm:h-32 sm:w-32 lg:h-40 lg:w-40">
                  {Array.from({ length: 64 }).map((_, idx) => {
                    const darkCell = idx % 2 === 0 || idx % 7 === 0 || idx % 11 === 0;
                    return <span key={idx} className={darkCell ? "rounded-[2px] bg-foreground/80" : "rounded-[2px] bg-transparent"} />;
                  })}
                </div>
                <p className="mt-4 text-center text-base font-semibold text-foreground">{visualTitle}</p>
                <p className="mt-1 text-center text-sm text-muted-foreground">{visualSubtitle}</p>
                <p className="mt-4 text-center text-xs text-muted-foreground">{visualHelper}</p>
              </div>
            </section>
            </div>
        </div>
      </div>
    </div>
  );
}
