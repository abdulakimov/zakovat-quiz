"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type DropdownContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DropdownContext = React.createContext<DropdownContextValue | null>(null);
type MenuChildProps = { className?: string; onClick?: React.MouseEventHandler };

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-flex">{children}</div>
    </DropdownContext.Provider>
  );
}

export function DropdownMenuTrigger({
  children,
  asChild,
}: {
  children: React.ReactElement;
  asChild?: boolean;
}) {
  const ctx = React.useContext(DropdownContext);
  if (!ctx) return children;

  const triggerProps = {
    onClick: () => ctx.setOpen(!ctx.open),
    "aria-expanded": ctx.open,
    "aria-haspopup": "menu" as const,
  };

  if (asChild && React.isValidElement<MenuChildProps>(children)) {
    const childProps = children.props;
    return React.cloneElement(children, {
      ...childProps,
      ...triggerProps,
    });
  }

  return <button type="button" {...triggerProps}>{children}</button>;
}

export function DropdownMenuContent({
  children,
  className,
  align = "end",
}: {
  children: React.ReactNode;
  className?: string;
  align?: "start" | "end";
}) {
  const ctx = React.useContext(DropdownContext);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!ctx || !ctx.open) return;
    const { setOpen } = ctx;

    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [ctx]);

  if (!ctx?.open) return null;

  return (
    <div
      ref={ref}
      role="menu"
      className={cn(
        "absolute top-full z-50 mt-2 min-w-52 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl",
        align === "end" ? "right-0" : "left-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DropdownMenuLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)}>{children}</div>;
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn("my-1 h-px bg-border", className)} />;
}

export function DropdownMenuItem({
  children,
  className,
  asChild,
  disabled,
  onSelect,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  onSelect?: (event: { preventDefault: () => void; defaultPrevented: boolean }) => void;
}) {
  const ctx = React.useContext(DropdownContext);

  const handleClick = (event: React.MouseEvent) => {
    if (disabled) {
      return;
    }
    const selectEvent = {
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
    };
    onSelect?.(selectEvent);
    if (!selectEvent.defaultPrevented) {
      ctx?.setOpen(false);
    }
    props.onClick?.(event as React.MouseEvent<HTMLButtonElement>);
  };

  const itemProps = {
    ...props,
    className: cn(
      "flex w-full cursor-pointer items-center rounded-md px-2 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground",
      disabled ? "cursor-not-allowed opacity-50 hover:bg-transparent" : "",
      className,
    ),
    onClick: handleClick,
    role: "menuitem",
  };

  if (asChild && React.isValidElement<MenuChildProps>(children)) {
    const childProps = children.props;
    return React.cloneElement(children, {
      ...childProps,
      ...itemProps,
      className: cn(itemProps.className, childProps.className),
      onClick: (event: React.MouseEvent) => {
        itemProps.onClick(event);
        childProps.onClick?.(event);
      },
    });
  }

  return (
    <button type="button" {...itemProps}>
      {children}
    </button>
  );
}
