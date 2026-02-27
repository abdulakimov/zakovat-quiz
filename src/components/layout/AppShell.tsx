import type { ReactNode } from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { signOut } from "@/app/auth/actions";
import { LanguageSwitcher } from "@/src/components/LanguageSwitcher";
import { PageMotion } from "@/src/components/layout/PageMotion";
import { ThemeSwitcher } from "@/src/components/theme/ThemeSwitcher";
import {
  BoxIcon,
  ChevronDownIcon,
  LogOutIcon,
  MenuIcon,
  PresentationIcon,
  SettingsIcon,
  UserIcon,
  UsersIcon,
} from "@/src/components/ui/icons";
import { localizeHref, type AppLocale } from "@/src/i18n/config";

type AppShellUser = {
  id: string;
  username: string;
  name: string | null;
  displayName?: string | null;
  avatarAsset?: { id: string; path: string } | null;
};

type AppShellProps = {
  children: ReactNode;
  user: AppShellUser | null;
};

type NavItem = {
  href?: string;
  label: string;
  icon: ReactNode;
  disabled?: boolean;
};

function getInitials(user: AppShellUser | null) {
  const source = user?.displayName?.trim() || user?.name?.trim() || user?.username || "U";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function DisabledNavItem({ item, comingSoon }: { item: NavItem; comingSoon: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground/70"
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{comingSoon}</TooltipContent>
    </Tooltip>
  );
}

function DesktopNav({ items, comingSoon }: { items: NavItem[]; comingSoon: string }) {
  return (
    <TooltipProvider>
      <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
        {items.map((item) =>
          item.disabled ? (
            <DisabledNavItem key={item.label} item={item} comingSoon={comingSoon} />
          ) : (
            <Link
              key={item.label}
              href={item.href!}
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ),
        )}
      </nav>
    </TooltipProvider>
  );
}

function MobileNav({
  items,
  openNavigation,
  navigation,
  soon,
}: {
  items: NavItem[];
  openNavigation: string;
  navigation: string;
  soon: string;
}) {
  return (
    <TooltipProvider>
      <div className="md:hidden">
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-9 px-2">
                  <MenuIcon className="h-4 w-4" />
                  <span className="sr-only">{openNavigation}</span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>{navigation}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="min-w-48">
            <DropdownMenuLabel>{navigation}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {items.map((item) =>
              item.disabled ? (
                <div key={item.label} className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground/70">
                  {item.icon}
                  <span>{item.label}</span>
                  <span className="ml-auto text-xs">{soon}</span>
                </div>
              ) : (
                <DropdownMenuItem key={item.label} asChild>
                  <Link href={item.href!}>
                    <span className="mr-2">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </DropdownMenuItem>
              ),
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}

function ProfileMenu({
  user,
  locale,
  accountMenu,
  profileLabel,
  settingsLabel,
  logOutLabel,
}: {
  user: AppShellUser | null;
  locale: AppLocale;
  accountMenu: string;
  profileLabel: string;
  settingsLabel: string;
  logOutLabel: string;
}) {
  const displayName = user?.displayName ?? user?.name ?? user?.username ?? "User";
  const username = user?.username ? `@${user.username}` : "";
  const avatarUrl = user?.avatarAsset?.path ? `/api/media/${user.avatarAsset.path}` : null;

  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-10 gap-2 rounded-full px-2 sm:px-3"
              >
                <Avatar className="h-7 w-7">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                  {!avatarUrl ? <AvatarFallback>{getInitials(user)}</AvatarFallback> : null}
                </Avatar>
                <span className="hidden max-w-36 truncate text-sm sm:inline">{displayName}</span>
                <ChevronDownIcon className="hidden h-4 w-4 text-muted-foreground sm:block" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{accountMenu}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-foreground">{displayName}</p>
            {username ? <p className="text-xs text-muted-foreground">{username}</p> : null}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={localizeHref(locale, "/app/profile")}>
            <span className="mr-2">
              <UserIcon className="h-4 w-4" />
            </span>
            <span>{profileLabel}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={localizeHref(locale, "/app/settings")}>
            <span className="mr-2">
              <SettingsIcon className="h-4 w-4" />
            </span>
            <span>{settingsLabel}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="px-1">
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center rounded-md px-2 py-2 text-sm text-destructive hover:bg-destructive/10"
            >
              <LogOutIcon className="mr-2 h-4 w-4" />
              {logOutLabel}
            </button>
          </form>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export async function AppShell({ children, user }: AppShellProps) {
  const locale = (await getLocale()) as AppLocale;
  const [tNav, tCommon] = await Promise.all([getTranslations("nav"), getTranslations("common")]);

  const navItems: NavItem[] = [
    { href: localizeHref(locale, "/app/teams"), label: tNav("teams"), icon: <UsersIcon className="h-4 w-4" /> },
    { href: localizeHref(locale, "/app/packs"), label: tNav("packs"), icon: <BoxIcon className="h-4 w-4" /> },
    { label: tNav("presenter"), icon: <PresentationIcon className="h-4 w-4" />, disabled: true },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <MobileNav
            items={navItems}
            openNavigation={tCommon("openNavigation")}
            navigation={tCommon("navigation")}
            soon={tCommon("soon")}
          />

          <div className="flex min-w-0 items-center gap-3">
            <Link href={localizeHref(locale, "/app")} className="inline-flex items-center gap-2 rounded-md px-1 py-1">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                Z
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight text-foreground">Zakovat</p>
                <p className="hidden text-xs text-muted-foreground sm:block">Quiz Creator</p>
              </div>
            </Link>
          </div>

          <Separator orientation="vertical" className="hidden h-6 md:block" />

          <DesktopNav items={navItems} comingSoon={tCommon("comingSoon")} />

          <div className="ml-auto flex items-center gap-2">
            <ThemeSwitcher />
            <LanguageSwitcher />
            <ProfileMenu
              user={user}
              locale={locale}
              accountMenu={tCommon("accountMenu")}
              profileLabel={tCommon("profile")}
              settingsLabel={tCommon("settings")}
              logOutLabel={tCommon("logOut")}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <PageMotion>{children}</PageMotion>
      </main>
    </div>
  );
}
