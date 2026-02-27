"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Ctx = { open: boolean; setOpen: (v: boolean) => void };
const AlertDialogContext = React.createContext<Ctx | null>(null);
type ClickableChildProps = { onClick?: React.MouseEventHandler };

export function AlertDialog({
  children,
  open,
  onOpenChange,
}: {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internal, setInternal] = React.useState(false);
  const controlled = typeof open === "boolean";
  const value = controlled ? open : internal;
  const setOpen = (next: boolean) => {
    if (!controlled) setInternal(next);
    onOpenChange?.(next);
  };
  return <AlertDialogContext.Provider value={{ open: value, setOpen }}>{children}</AlertDialogContext.Provider>;
}

export function AlertDialogTrigger({ children, asChild }: { children: React.ReactElement; asChild?: boolean }) {
  const ctx = React.useContext(AlertDialogContext);
  if (!ctx) return children;
  const props = { onClick: () => ctx.setOpen(true) };
  if (asChild && React.isValidElement<ClickableChildProps>(children)) {
    const childProps = children.props;
    return React.cloneElement(children, {
      ...childProps,
      ...props,
      onClick: (e: React.MouseEvent) => {
        props.onClick();
        childProps.onClick?.(e);
      },
    });
  }
  return <button type="button" {...props}>{children}</button>;
}

export function AlertDialogContent({ children, className }: { children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(AlertDialogContext);
  if (!ctx?.open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onMouseDown={() => ctx.setOpen(false)}>
      <div
        role="alertdialog"
        aria-modal="true"
        className={cn("w-full max-w-md rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xl", className)}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function AlertDialogHeader(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1", props.className)} {...props} />;
}
export function AlertDialogTitle(props: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-semibold text-foreground", props.className)} {...props} />;
}
export function AlertDialogDescription(props: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", props.className)} {...props} />;
}
export function AlertDialogFooter(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-4 flex justify-end gap-2", props.className)} {...props} />;
}
export function AlertDialogCancel({ children, asChild }: { children: React.ReactElement; asChild?: boolean }) {
  const ctx = React.useContext(AlertDialogContext);
  if (!ctx) return children;
  const props = { onClick: () => ctx.setOpen(false) };
  if (asChild && React.isValidElement<ClickableChildProps>(children)) {
    const childProps = children.props;
    return React.cloneElement(children, {
      ...childProps,
      ...props,
      onClick: (e: React.MouseEvent) => {
        props.onClick();
        childProps.onClick?.(e);
      },
    });
  }
  return <button type="button" {...props}>{children}</button>;
}
export function AlertDialogAction({ children, asChild }: { children: React.ReactElement; asChild?: boolean }) {
  if (asChild) return children;
  return <>{children}</>;
}
