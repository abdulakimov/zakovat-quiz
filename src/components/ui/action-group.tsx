import * as React from "react";
import { cn } from "@/lib/utils";

export function ActionGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("flex items-center gap-1", className)}>{children}</div>;
}
