"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { renameTeam } from "@/src/actions/teams";
import { IconButton } from "@/src/components/ui/icon-button";
import { useTranslations } from "@/src/i18n/client";
import { localizeHref, normalizeLocale } from "@/src/i18n/config";
import { toast } from "@/src/components/ui/sonner";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { CopyIcon, LinkIcon, PencilIcon } from "@/src/ui/icons";
import { renameTeamSchema } from "@/src/schemas/teams";

type TeamDetailHeaderProps = {
  teamId: string;
  initialName: string;
  avatarUrl?: string | null;
  slogan?: string | null;
  memberCount: number;
  isOwner: boolean;
  extraActions?: React.ReactNode;
};

async function copyWithFallback(value: string) {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to legacy copy fallback.
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}

export function TeamDetailHeader({
  teamId,
  initialName,
  avatarUrl,
  slogan,
  memberCount,
  isOwner,
  extraActions,
}: TeamDetailHeaderProps) {
  const locale = normalizeLocale(useLocale());
  const tTeams = useTranslations("teams");
  const tCommon = useTranslations("common");
  const [isEditing, setIsEditing] = React.useState(false);
  const [currentName, setCurrentName] = React.useState(initialName);
  const [isPending, startTransition] = React.useTransition();
  const form = useForm({
    resolver: zodResolver(renameTeamSchema.pick({ name: true })),
    defaultValues: { name: initialName },
  });

  React.useEffect(() => {
    setCurrentName(initialName);
    form.reset({ name: initialName });
  }, [initialName, form]);

  const save = form.handleSubmit((values) => {
    startTransition(() => {
      void (async () => {
        const fd = new FormData();
        fd.set("teamId", teamId);
        fd.set("name", values.name);
        const result = await renameTeam({}, fd);
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        setCurrentName(values.name);
        setIsEditing(false);
        toast.success(result?.success ?? tTeams("saved"));
      })();
    });
  });

  return (
    <TooltipProvider>
      <PageHeader
        backHref={localizeHref(locale, "/app/teams")}
        breadcrumbs={[
          { label: tCommon("app"), href: localizeHref(locale, "/app") },
          { label: tTeams("title"), href: localizeHref(locale, "/app/teams") },
          { label: currentName },
        ]}
        title={
          <div className="flex flex-wrap items-center gap-3">
            <Avatar className="h-12 w-12 rounded-xl">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={currentName} className="rounded-xl" /> : null}
              {!avatarUrl ? (
                <AvatarFallback className="rounded-xl">{currentName.slice(0, 2).toUpperCase()}</AvatarFallback>
              ) : null}
            </Avatar>
            {!isEditing ? (
              <>
                <span className="truncate text-2xl font-semibold tracking-tight text-slate-900">{currentName}</span>
                <Badge>{tTeams("membersCount", { count: memberCount })}</Badge>
                {isOwner ? (
                  <IconButton
                    label={tTeams("renameTeam")}
                    tooltip={tTeams("rename")}
                    className="h-8 w-8"
                    onClick={() => setIsEditing(true)}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </IconButton>
                ) : null}
              </>
            ) : (
              <form onSubmit={save} className="flex flex-wrap items-center gap-2">
                <div className="min-w-0">
                  <Input
                    autoFocus
                    {...form.register("name")}
                    disabled={isPending}
                    aria-invalid={form.formState.errors.name ? "true" : "false"}
                    className="h-10 text-base"
                  />
                  {form.formState.errors.name ? (
                    <p className="mt-1 text-xs text-red-600">{form.formState.errors.name.message}</p>
                  ) : null}
                </div>
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending ? tCommon("saving") : tCommon("save")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => {
                    form.reset({ name: currentName });
                    setIsEditing(false);
                  }}
                >
                  {tCommon("cancel")}
                </Button>
              </form>
            )}
          </div>
        }
        description={slogan?.trim() ? slogan : tTeams("manageMembersInvites")}
        actions={
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="justify-center sm:justify-start"
                  onClick={() => {
                    void (async () => {
                      const ok = await copyWithFallback(teamId);
                      if (ok) toast.success(tTeams("copied"));
                      else toast.error(tTeams("copyFailed"));
                    })();
                  }}
                >
                  <CopyIcon className="mr-2 h-4 w-4" />
                  <span className="sm:hidden">{tTeams("copyIdShort")}</span>
                  <span className="hidden sm:inline">{tTeams("copyTeamId")}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{tTeams("copyTeamId")}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button type="button" variant="outline" size="sm" disabled className="justify-center sm:justify-start">
                    <LinkIcon className="mr-2 h-4 w-4" />
                    <span className="sm:hidden">{tTeams("shareLink")}</span>
                    <span className="hidden sm:inline">{tTeams("copyShareLink")}</span>
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{tCommon("comingSoon")}</TooltipContent>
            </Tooltip>

            {extraActions}
          </div>
        }
      />
    </TooltipProvider>
  );
}
