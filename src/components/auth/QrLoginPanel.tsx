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
    <section className="space-y-3" data-testid="qr-panel" data-session-id={data?.sessionId ?? ""}>
      <div className="space-y-1">
        <p className="text-xl font-semibold text-foreground">{tAuth("qr.desktop.title")}</p>
        <p className="max-w-xs text-sm text-muted-foreground">{tAuth("qr.desktop.subtitle")}</p>
      </div>

      <div className="min-h-[360px] rounded-xl border border-border bg-card/30 p-4" data-testid="qr-frame">
        <div className="flex items-center justify-center">
          <div
            className="mx-auto flex h-[260px] w-[260px] items-center justify-center rounded-lg border border-border/40 bg-white p-3"
            data-testid="qr-tile"
          >
            {data?.qrDataUrl ? (
              <img
                src={data.qrDataUrl}
                alt={tAuth("qr.desktop.imageAlt")}
                className="h-[210px] w-[210px] object-contain [image-rendering:pixelated]"
                data-testid="qr-code-image"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-md bg-muted/30">
                <span className="text-sm text-muted-foreground">{tAuth("qr.desktop.loading")}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex min-h-[44px] items-center justify-between gap-3">
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
            {tAuth("qr.desktop.expiresIn", { count: remaining })}
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
    </section>
  );
}
