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
          className="w-full rounded-2xl border bg-card/60 p-6 shadow-sm backdrop-blur-xl md:p-7"
          data-testid="auth-shell"
        >
          <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
            <section className="mx-auto w-full max-w-md space-y-4 md:max-w-none" data-testid="provider-panel">
              <div data-testid="auth-left">{leftContent}</div>
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
