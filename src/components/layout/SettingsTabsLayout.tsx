"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type TabItem = {
  key: string;
  label: string;
  icon: "users" | "settings" | "danger" | "profile" | "security" | "rounds";
  content: React.ReactNode;
  testId?: string;
};

type SettingsTabsLayoutProps = {
  items: TabItem[];
  paramKey?: string;
  defaultKey?: string;
};

function resolveKey(items: TabItem[], raw: string | null, fallback?: string) {
  if (raw && items.some((item) => item.key === raw)) return raw;
  if (fallback && items.some((item) => item.key === fallback)) return fallback;
  return items[0]?.key ?? "";
}

import {
  AlertTriangleIcon,
  LayoutListIcon,
  SettingsIcon,
  ShieldIcon,
  UserIconLucide,
  UsersIconLucide,
} from "@/src/ui/icons";

const ICONS: Record<TabItem["icon"], React.ComponentType<{ className?: string }>> = {
  users: UsersIconLucide,
  settings: SettingsIcon,
  danger: AlertTriangleIcon,
  profile: UserIconLucide,
  security: ShieldIcon,
  rounds: LayoutListIcon,
};

export function SettingsTabsLayout({ items, paramKey = "tab", defaultKey }: SettingsTabsLayoutProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeKey = resolveKey(items, searchParams.get(paramKey), defaultKey);
  const activeItem = items.find((item) => item.key === activeKey) ?? items[0];

  const handleChange = React.useCallback(
    (next: string) => {
      const nextKey = resolveKey(items, next, defaultKey);
      const params = new URLSearchParams(searchParams.toString());
      params.set(paramKey, nextKey);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [defaultKey, items, paramKey, pathname, router, searchParams],
  );

  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-3">
        <div className="flex w-full gap-2 overflow-x-auto pb-1">
          {items.map((item) => {
            const Icon = ICONS[item.icon];
            const active = item.key === activeKey;
            return (
              <button
                key={item.key}
                type="button"
                data-testid={item.testId}
                onClick={() => handleChange(item.key)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none",
                  active
                    ? "border-border bg-muted text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground", active && "bg-background")}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>{activeItem?.content}</div>
    </div>
  );
}
