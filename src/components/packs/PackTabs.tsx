"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const TAB_VALUES = ["rounds", "settings"] as const;

type TabValue = (typeof TAB_VALUES)[number];

type PackTabsProps = {
  rounds: React.ReactNode;
  settings: React.ReactNode;
};

function getTabValue(raw: string | null): TabValue {
  if (raw === "settings") return "settings";
  return "rounds";
}

export function PackTabs({ rounds, settings }: PackTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const value = getTabValue(searchParams.get("tab"));

  const handleChange = React.useCallback(
    (next: string) => {
      const nextValue = getTabValue(next);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", nextValue);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background p-1 text-muted-foreground">
          <button
            type="button"
            onClick={() => handleChange("rounds")}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition",
              value === "rounds" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            Rounds
          </button>
          <button
            type="button"
            onClick={() => handleChange("settings")}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition",
              value === "settings" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            Settings
          </button>
        </div>
      </div>
      <div>{value === "rounds" ? rounds : settings}</div>
    </div>
  );
}
