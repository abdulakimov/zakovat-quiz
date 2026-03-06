import * as React from "react";
import { cn } from "@/lib/utils";

export function FormMessage({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-xs text-destructive", className)}
      {...props}
    />
  );
}
