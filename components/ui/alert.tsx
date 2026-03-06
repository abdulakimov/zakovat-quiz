import * as React from "react";
import { cn } from "@/lib/utils";

const alertVariants = {
  default: "border-border bg-card text-card-foreground",
  destructive:
    "border-destructive/40 bg-destructive/10 text-foreground",
} as const;

type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: keyof typeof alertVariants;
};

export function Alert({
  className,
  variant = "default",
  ...props
}: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "relative w-full rounded-lg border px-3 py-2 text-sm",
        alertVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("leading-5", className)} {...props} />;
}
