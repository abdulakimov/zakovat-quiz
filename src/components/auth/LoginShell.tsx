import type { ReactNode } from "react";
import { AuthBackground } from "@/src/components/auth/AuthBackground";

type LoginShellProps = {
  leftContent: ReactNode;
  rightContent: ReactNode;
};

export function LoginShell({ leftContent, rightContent }: LoginShellProps) {
  return (
    <div className="relative min-h-screen bg-background">
      <AuthBackground />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-start px-4 py-8 lg:items-center">
        <div
          className="w-full rounded-2xl border border-border bg-card/60 p-6 shadow-sm backdrop-blur-xl md:p-7"
          data-testid="auth-shell"
        >
          <div className="grid gap-6 md:grid-cols-[0.8fr_1fr]">
            <section className="mx-auto flex w-full max-w-md space-y-4 md:max-w-none md:items-center" data-testid="provider-panel">
              <div className="mx-auto w-full max-w-[440px] text-left" data-testid="auth-left">
                {leftContent}
              </div>
            </section>
            <section className="hidden md:block" data-testid="auth-right">
              {rightContent}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
