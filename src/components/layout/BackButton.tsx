"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon } from "@/src/ui/icons";

type BackButtonProps = {
  href?: string;
  onBeforeBack?: () => boolean;
};

export function BackButton({ href, onBeforeBack }: BackButtonProps) {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 px-2 text-xs font-medium"
      onClick={() => {
        if (onBeforeBack && !onBeforeBack()) return;
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }
        if (href) router.push(href);
      }}
    >
      <ChevronLeftIcon className="mr-1 h-4 w-4" aria-hidden />
      Back
    </Button>
  );
}
