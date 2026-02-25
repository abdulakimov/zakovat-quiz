import * as React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type IconButtonProps = React.ComponentProps<typeof Button> & {
  label: string;
  tooltip?: string;
};

export function IconButton({
  label,
  tooltip,
  className,
  disabled,
  children,
  ...props
}: IconButtonProps) {
  const content = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      disabled={disabled}
      className={cn("h-9 w-9", className)}
      {...props}
    >
      {children}
    </Button>
  );

  if (!tooltip) {
    return content;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {disabled ? <span className="inline-flex">{content}</span> : content}
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
