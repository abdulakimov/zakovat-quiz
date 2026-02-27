"use client";

import * as React from "react";

type ToastKind = "success" | "error" | "message";

type ToastItem = {
  id: number;
  kind: ToastKind;
  message: string;
};

type ToastListener = (items: ToastItem[]) => void;

let nextId = 1;
let toasts: ToastItem[] = [];
const listeners = new Set<ToastListener>();

function emit() {
  for (const listener of listeners) {
    listener(toasts);
  }
}

function pushToast(kind: ToastKind, message: string) {
  const id = nextId++;
  toasts = [...toasts, { id, kind, message }];
  emit();

  window.setTimeout(() => {
    toasts = toasts.filter((toast) => toast.id !== id);
    emit();
  }, 3000);

  return id;
}

export const toast = {
  success(message: string) {
    return pushToast("success", message);
  },
  error(message: string) {
    return pushToast("error", message);
  },
  message(message: string) {
    return pushToast("message", message);
  },
};

type ToasterProps = {
  position?: "top-right";
  richColors?: boolean;
  closeButton?: boolean;
  toastOptions?: {
    classNames?: {
      toast?: string;
    };
  };
};

export function Toaster(props: ToasterProps) {
  void props;
  const [items, setItems] = React.useState<ToastItem[]>([]);

  React.useEffect(() => {
    listeners.add(setItems);
    setItems(toasts);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          role="status"
          className={[
            "pointer-events-auto rounded-lg border bg-card px-4 py-3 text-sm text-card-foreground shadow-lg",
            item.kind === "success" ? "border-chart-2/30 bg-chart-2/10 text-chart-2" : "",
            item.kind === "error" ? "border-destructive/30 bg-destructive/10 text-destructive" : "",
            item.kind === "message" ? "border-border" : "",
          ].join(" ")}
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}
