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
      <div className="relative z-10 mx-auto flex min-h-screen w-full items-center justify-center p-4 md:p-6">
        <div
          className="w-full max-w-5xl rounded-3xl border border-border bg-card/50 p-6 shadow-sm backdrop-blur-xl md:p-10"
          data-testid="auth-shell"
        >
          <div className="grid gap-8 md:grid-cols-2 md:items-center md:gap-12">
            <section className="mx-auto w-full max-w-md pt-0 md:flex md:max-w-none md:items-center" data-testid="provider-panel">
              <div className="w-full" data-testid="auth-left">
                <div className="mx-auto w-full max-w-[520px] space-y-4 pt-0 text-center" data-testid="left-inner">
                  {leftContent}
                </div>
              </div>
            </section>
            <section className="mx-auto hidden w-full max-w-md pt-0 md:flex md:max-w-none md:items-center" data-testid="auth-right">
              <div className="mx-auto w-full max-w-[520px]">{rightContent}</div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
