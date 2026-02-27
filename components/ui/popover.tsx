"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type PopoverCtx = { open: boolean; setOpen: (open: boolean) => void };
const PopoverContext = React.createContext<PopoverCtx | null>(null);
type ClickableChildProps = { onClick?: React.MouseEventHandler };

export function Popover({
  children,
  open,
  onOpenChange,
}: {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const controlled = typeof open === "boolean";
  const value = controlled ? open : internalOpen;
  const setOpen = (next: boolean) => {
    if (!controlled) setInternalOpen(next);
    onOpenChange?.(next);
  };
  return <PopoverContext.Provider value={{ open: value, setOpen }}>{children}</PopoverContext.Provider>;
}

export function PopoverTrigger({ children, asChild }: { children: React.ReactElement; asChild?: boolean }) {
  const ctx = React.useContext(PopoverContext);
  if (!ctx) return children;
  const triggerProps = {
    onClick: () => ctx.setOpen(!ctx.open),
    "aria-expanded": ctx.open,
    "aria-haspopup": "dialog" as const,
  };
  if (asChild && React.isValidElement<ClickableChildProps>(children)) {
    const childProps = children.props;
    return React.cloneElement(children, {
      ...childProps,
      ...triggerProps,
      onClick: (e: React.MouseEvent) => {
        triggerProps.onClick();
        childProps.onClick?.(e);
      },
    });
  }
  return <button type="button" {...triggerProps}>{children}</button>;
}

export function PopoverContent({
  children,
  className,
  align = "start",
}: {
  children: React.ReactNode;
  className?: string;
  align?: "start" | "end";
}) {
  const ctx = React.useContext(PopoverContext);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!ctx || !ctx.open) return;
    const { setOpen } = ctx;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [ctx]);

  if (!ctx?.open) return null;
  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-30 mt-2 w-full rounded-lg border border-border bg-popover text-popover-foreground shadow-lg",
        align === "end" ? "right-0" : "left-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
