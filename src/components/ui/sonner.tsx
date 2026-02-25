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
            "pointer-events-auto rounded-lg border bg-white px-4 py-3 text-sm shadow-lg",
            item.kind === "success" ? "border-emerald-200 text-emerald-900" : "",
            item.kind === "error" ? "border-red-200 text-red-900" : "",
            item.kind === "message" ? "border-slate-200 text-slate-900" : "",
          ].join(" ")}
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}
