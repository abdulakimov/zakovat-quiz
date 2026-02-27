import type { ReactNode } from "react";

type AuthLayoutProps = {
  children: ReactNode;
  title?: string;
  description?: string;
};

export function AuthLayout({
  children,
  title = "Zakovat Quiz Creator",
  description = "Secure sign-in for your workspace.",
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <section className="hidden rounded-2xl border border-border bg-card/80 p-8 shadow-sm lg:block">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Authentication
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </section>
          <div className="mx-auto w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
