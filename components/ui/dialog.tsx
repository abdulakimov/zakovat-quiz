"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type DialogContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);
type ClickableChildProps = { onClick?: React.MouseEventHandler };

export function Dialog({
  children,
  open,
  onOpenChange,
}: {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = typeof open === "boolean";
  const value = isControlled ? open : internalOpen;

  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  return <DialogContext.Provider value={{ open: value, setOpen }}>{children}</DialogContext.Provider>;
}

export function DialogTrigger({
  children,
  asChild,
}: {
  children: React.ReactElement;
  asChild?: boolean;
}) {
  const ctx = React.useContext(DialogContext);
  if (!ctx) return children;
  const triggerProps = {
    onClick: () => ctx.setOpen(true),
  };
  if (asChild && React.isValidElement<ClickableChildProps>(children)) {
    const childProps = children.props;
    return React.cloneElement(children, {
      ...childProps,
      ...triggerProps,
      onClick: (event: React.MouseEvent) => {
        triggerProps.onClick();
        childProps.onClick?.(event);
      },
    });
  }
  return <button type="button" {...triggerProps}>{children}</button>;
}

export function DialogContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(DialogContext);

  React.useEffect(() => {
    if (!ctx?.open) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") ctx.setOpen(false);
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [ctx]);

  if (!ctx?.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 p-4" onMouseDown={() => ctx.setOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        className={cn("w-full max-w-lg rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xl", className)}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 space-y-1", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-semibold text-foreground", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function DialogClose({
  children,
  asChild,
}: {
  children: React.ReactElement;
  asChild?: boolean;
}) {
  const ctx = React.useContext(DialogContext);
  if (!ctx) return children;

  const closeProps = {
    onClick: () => ctx.setOpen(false),
  };

  if (asChild && React.isValidElement<ClickableChildProps>(children)) {
    const childProps = children.props;
    return React.cloneElement(children, {
      ...childProps,
      ...closeProps,
      onClick: (event: React.MouseEvent) => {
        closeProps.onClick();
        childProps.onClick?.(event);
      },
    });
  }

  return <button type="button" {...closeProps}>{children}</button>;
}
