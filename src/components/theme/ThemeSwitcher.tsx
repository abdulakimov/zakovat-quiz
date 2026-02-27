"use client";

import * as React from "react";
import { Check, Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslations } from "@/src/i18n/client";

type ThemeMode = "light" | "dark" | "system";

export function ThemeSwitcher() {
  const tCommon = useTranslations("common");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted && theme ? (theme as ThemeMode) : "system";

  const options: Array<{ value: ThemeMode; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { value: "light", label: tCommon("themeLight"), icon: Sun },
    { value: "dark", label: tCommon("themeDark"), icon: Moon },
    { value: "system", label: tCommon("themeSystem"), icon: Laptop },
  ];

  const activeOption = options.find((option) => option.value === currentTheme) ?? options[2];
  const ActiveIcon = activeOption.icon;

  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0"
                data-testid="theme-switcher"
                aria-label={tCommon("theme")}
              >
                <ActiveIcon className="h-4 w-4" aria-hidden />
                <span className="sr-only">{activeOption.label}</span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{`${tCommon("theme")}: ${activeOption.label}`}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuLabel>{tCommon("theme")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => {
          const OptionIcon = option.icon;
          const active = option.value === currentTheme;
          return (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => setTheme(option.value)}
              className="justify-between"
              data-testid={`theme-${option.value}`}
              aria-label={option.label}
            >
              <span className="inline-flex items-center gap-2">
                <OptionIcon className="h-4 w-4" aria-hidden />
                <span>{option.label}</span>
              </span>
              {active ? <Check className="h-4 w-4" aria-hidden /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
