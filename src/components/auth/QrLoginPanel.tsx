"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/src/i18n/client";

type QrStartResponse = {
  qrUrl: string;
  qrDataUrl: string;
  expiresAt: string;
  sessionId: string;
};

type QrStatus = "idle" | "waiting" | "approved" | "expired" | "error";

function secondsLeft(expiresAt: string | null) {
  if (!expiresAt) {
    return 0;
  }
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

export function QrLoginPanel() {
  const tAuth = useTranslations("auth");
  const [data, setData] = React.useState<QrStartResponse | null>(null);
  const [status, setStatus] = React.useState<QrStatus>("idle");
  const [remaining, setRemaining] = React.useState(0);
  const [consumeError, setConsumeError] = React.useState(false);
  const consumeStartedRef = React.useRef(false);

  const startSession = React.useCallback(async () => {
    setStatus("idle");
    setConsumeError(false);
    consumeStartedRef.current = false;

    const response = await fetch("/auth/qr/start", {
      method: "POST",
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Failed to start QR session");
    }

    const payload = (await response.json()) as QrStartResponse;
    setData(payload);
    setRemaining(secondsLeft(payload.expiresAt));
    setStatus("waiting");
  }, []);

  React.useEffect(() => {
    void startSession().catch(() => {
      setStatus("error");
    });
  }, [startSession]);

  React.useEffect(() => {
    if (!data?.expiresAt || status === "expired") {
      return;
    }

    const timer = window.setInterval(() => {
      const nextSeconds = secondsLeft(data.expiresAt);
      setRemaining(nextSeconds);
      if (nextSeconds <= 0) {
        setStatus("expired");
      }
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [data?.expiresAt, status]);

  React.useEffect(() => {
    if (!data?.sessionId || status !== "waiting") {
      return;
    }

    const poll = async () => {
      const response = await fetch(`/auth/qr/status?sid=${encodeURIComponent(data.sessionId)}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        if (response.status === 429) {
          return;
        }
        throw new Error("Failed to poll QR status");
      }

      const payload = (await response.json()) as { status: string };
      if (payload.status === "APPROVED") {
        setStatus("approved");
      } else if (payload.status === "EXPIRED") {
        setStatus("expired");
      }
    };

    const timer = window.setInterval(() => {
      void poll().catch(() => setStatus("error"));
    }, 1200);

    void poll().catch(() => setStatus("error"));

    return () => {
      window.clearInterval(timer);
    };
  }, [data?.sessionId, status]);

  React.useEffect(() => {
    if (status !== "approved" || !data?.sessionId || consumeStartedRef.current) {
      return;
    }
    consumeStartedRef.current = true;

    void (async () => {
      const response = await fetch("/auth/qr/consume", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ sid: data.sessionId }),
      });
      if (!response.ok) {
        setConsumeError(true);
        setStatus("error");
        return;
      }

      const payload = (await response.json()) as { redirectTo: string };
      window.location.assign(payload.redirectTo);
    })().catch(() => {
      setConsumeError(true);
      setStatus("error");
    });
  }, [data?.sessionId, status]);

  const statusText =
    status === "expired"
      ? tAuth("qr.desktop.expired")
      : status === "error"
        ? consumeError
          ? tAuth("qr.desktop.consumeError")
          : tAuth("qr.desktop.error")
        : status === "approved"
          ? tAuth("qr.desktop.approved")
          : tAuth("qr.desktop.waiting");

  return (
    <section className="flex flex-col items-center space-y-4 pt-0" data-testid="qr-panel" data-session-id={data?.sessionId ?? ""}>
      <div
        className="mx-auto w-full max-w-[460px] rounded-2xl border border-border/40 bg-gradient-to-br from-primary/8 via-background/0 to-indigo-500/10 p-5 dark:from-primary/10 dark:to-sky-500/10"
        data-testid="qr-panel-wrap"
      >
        <div className="mx-auto w-full max-w-[420px] rounded-2xl border border-border/60 bg-background/40 p-6" data-testid="qr-frame">
          <div className="flex items-center justify-center">
            <div
              className="mx-auto flex h-[240px] w-[240px] items-center justify-center rounded-xl bg-white p-4 shadow-sm"
              data-testid="qr-tile"
            >
              {data?.qrDataUrl ? (
                <img
                  src={data.qrDataUrl}
                  alt={tAuth("qr.desktop.imageAlt")}
                  className="h-full w-full object-contain [image-rendering:pixelated]"
                  data-testid="qr-code-image"
                />
              ) : (
                <div className="h-full w-full animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-700/50" />
              )}
            </div>
          </div>

          <div className="mt-3 flex min-h-8 items-center justify-center gap-6 text-xs">
            <p className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="qr-status-text">
              {status === "waiting" ? (
                <span
                  aria-hidden="true"
                  className="inline-flex h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-foreground"
                />
              ) : null}
              <span>{statusText}</span>
            </p>
            <p className="text-xs text-muted-foreground" data-testid="qr-countdown">
              {tAuth("qr.countdown", { count: remaining })}
            </p>
          </div>

          <div className="mt-2 flex min-h-8 items-center justify-end">
            {status === "expired" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void startSession().catch(() => setStatus("error"));
                }}
                data-testid="qr-restart"
              >
                {tAuth("qr.desktop.refresh")}
              </Button>
            ) : (
              <span className="inline-block min-h-8" aria-hidden="true" />
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 text-center" data-testid="right-header">
        <h2 className="text-lg font-semibold text-foreground" data-testid="qr-title">
          {tAuth("qr.title")}
        </h2>
        <p className="text-sm text-muted-foreground">{tAuth("qr.subtitle")}</p>
      </div>
    </section>
  );
}
