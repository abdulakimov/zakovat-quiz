"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type TabItem = {
  value: string;
  label: string;
  content: React.ReactNode;
};

type AppTabsProps = {
  tabs: TabItem[];
  paramKey?: string;
  defaultValue?: string;
};

function resolveValue(tabs: TabItem[], raw: string | null, fallback?: string) {
  if (raw && tabs.some((tab) => tab.value === raw)) return raw;
  if (fallback && tabs.some((tab) => tab.value === fallback)) return fallback;
  return tabs[0]?.value ?? "";
}

export function AppTabs({ tabs, paramKey = "tab", defaultValue }: AppTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const value = resolveValue(tabs, searchParams.get(paramKey), defaultValue);

  const handleChange = React.useCallback(
    (next: string) => {
      const nextValue = resolveValue(tabs, next, defaultValue);
      const params = new URLSearchParams(searchParams.toString());
      params.set(paramKey, nextValue);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [defaultValue, paramKey, pathname, router, searchParams, tabs],
  );

  const active = tabs.find((tab) => tab.value === value) ?? tabs[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white p-1 text-slate-600">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleChange(tab.value)}
              className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none",
                value === tab.value ? "bg-slate-900 text-white" : "text-slate-600",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div>{active?.content}</div>
    </div>
  );
}
