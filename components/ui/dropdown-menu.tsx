"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type DropdownContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  anchorRef: React.RefObject<HTMLDivElement | null>;
};

const DropdownContext = React.createContext<DropdownContextValue | null>(null);
type MenuChildProps = { className?: string; onClick?: React.MouseEventHandler };

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLDivElement | null>(null);
  return (
    <DropdownContext.Provider value={{ open, setOpen, anchorRef }}>
      <div ref={anchorRef} className="relative inline-flex">
        {children}
      </div>
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
  sideOffset = 8,
  collisionPadding = 12,
}: {
  children: React.ReactNode;
  className?: string;
  align?: "start" | "end";
  sideOffset?: number;
  collisionPadding?: number;
}) {
  const ctx = React.useContext(DropdownContext);
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const [position, setPosition] = React.useState<{ top: number; left: number }>({ top: 0, left: 0 });

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useLayoutEffect(() => {
    if (!ctx?.open || !ctx.anchorRef.current || !ref.current) return;
    const dropdown = ctx;

    function updatePosition() {
      if (!dropdown.anchorRef.current || !ref.current) return;
      const anchorRect = dropdown.anchorRef.current.getBoundingClientRect();
      const contentRect = ref.current.getBoundingClientRect();

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let left = align === "end" ? anchorRect.right - contentRect.width : anchorRect.left;
      const maxLeft = viewportWidth - collisionPadding - contentRect.width;
      left = Math.max(collisionPadding, Math.min(left, maxLeft));

      let top = anchorRect.bottom + sideOffset;
      const wouldOverflowBottom = top + contentRect.height > viewportHeight - collisionPadding;
      if (wouldOverflowBottom) {
        const aboveTop = anchorRect.top - sideOffset - contentRect.height;
        if (aboveTop >= collisionPadding) {
          top = aboveTop;
        } else {
          top = Math.max(collisionPadding, viewportHeight - collisionPadding - contentRect.height);
        }
      }

      setPosition({ top, left });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [align, collisionPadding, ctx, sideOffset]);

  React.useEffect(() => {
    if (!ctx || !ctx.open) return;
    const dropdown = ctx;
    const { setOpen } = ctx;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      const inContent = Boolean(ref.current?.contains(target));
      const inAnchor = Boolean(dropdown.anchorRef.current?.contains(target));
      if (!inContent && !inAnchor) {
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

  if (!ctx?.open || !mounted) return null;

  const content = (
    <div
      ref={ref}
      role="menu"
      style={{
        position: "fixed",
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      className={cn(
        "z-[1000] min-w-52 rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg",
        className,
      )}
    >
      {children}
    </div>
  );

  return createPortal(content, document.body);
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
