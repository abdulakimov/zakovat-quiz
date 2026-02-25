"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Accordion({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {children}
    </div>
  );
}

export function AccordionItem({
  className,
  children,
  open,
  ...props
}: React.DetailsHTMLAttributes<HTMLDetailsElement>) {
  return (
    <details
      className={cn("rounded-lg border border-slate-200 bg-white", className)}
      open={open}
      {...props}
    >
      {children}
    </details>
  );
}

export function AccordionTrigger({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <summary
      className={cn(
        "cursor-pointer list-none rounded-lg px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50",
        className,
      )}
      {...props}
    >
      {children}
    </summary>
  );
}

export function AccordionContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("accordion-content border-t border-slate-200 px-4 py-4", className)} {...props}>
      {children}
    </div>
  );
}
