"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { inviteMember, type TeamActionState } from "@/src/actions/teams";
import { FormErrorSummary } from "@/src/components/form/FormErrorSummary";
import { useTranslations } from "@/src/i18n/client";
import { toast } from "@/src/components/ui/sonner";
import { inviteSchema } from "@/src/schemas/teams";

type UserSuggestion = {
  id: string;
  username: string;
  email: string;
  name: string | null;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function InviteMemberForm({ teamId }: { teamId: string }) {
  const tTeams = useTranslations("teams");
  const [isPending, startTransition] = React.useTransition();
  const [serverState, setServerState] = React.useState<TeamActionState>({});
  const [suggestions, setSuggestions] = React.useState<UserSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = React.useState(false);
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<UserSuggestion | null>(null);

  const form = useForm({
    resolver: zodResolver(inviteSchema.pick({ usernameOrEmail: true })),
    defaultValues: { usernameOrEmail: "" },
  });

  const field = form.register("usernameOrEmail");
  const inviteValue = form.watch("usernameOrEmail") ?? "";
  const deferredInviteValue = React.useDeferredValue(inviteValue);
  const trimmedValue = inviteValue.trim();
  const canSubmit = !isPending && trimmedValue.length > 0;

  React.useEffect(() => {
    if (selectedUser) {
      const selectedValue = selectedUser.email || selectedUser.username;
      if (inviteValue !== selectedValue) {
        setSelectedUser(null);
      }
    }
  }, [inviteValue, selectedUser]);

  React.useEffect(() => {
    const query = deferredInviteValue.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setIsLoadingSuggestions(true);
        const response = await fetch(
          `/api/users/search?teamId=${encodeURIComponent(teamId)}&q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          setSuggestions([]);
          return;
        }
        const payload = (await response.json()) as { users?: UserSuggestion[] };
        setSuggestions(payload.users ?? []);
        setPopoverOpen(true);
      } catch (error) {
        if ((error as { name?: string })?.name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [deferredInviteValue, teamId]);

  const onSubmit = form.handleSubmit((values) => {
    setServerState({});
    startTransition(() => {
      void (async () => {
        const fd = new FormData();
        fd.set("teamId", teamId);
        fd.set("usernameOrEmail", values.usernameOrEmail);
        const result = await inviteMember({}, fd);
        setServerState(result ?? {});
        if (result?.error) toast.error(result.error);
        if (result?.success) {
          toast.success(result.success);
          form.reset({ usernameOrEmail: "" });
          setSelectedUser(null);
          setSuggestions([]);
          setPopoverOpen(false);
        }
      })();
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm" noValidate>
      <div className="space-y-2">
        <Label htmlFor="invite-username-or-email" className="text-sm text-muted-foreground">{tTeams("inviteMember")}</Label>

        {selectedUser ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted p-2">
            <Badge variant="secondary" className="rounded-md px-2 py-1">
              {tTeams("selectedUser")}
            </Badge>
            <div className="flex min-w-0 items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px]">{initials(selectedUser.name ?? selectedUser.username)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {selectedUser.name ?? selectedUser.username}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  @{selectedUser.username} - {selectedUser.email}
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="ml-auto"
              onClick={() => {
                setSelectedUser(null);
                form.setValue("usernameOrEmail", "", { shouldDirty: true, shouldTouch: true, shouldValidate: true });
              }}
            >
              {tTeams("clear")}
            </Button>
          </div>
        ) : null}

        <Popover open={popoverOpen && trimmedValue.length >= 2} onOpenChange={setPopoverOpen}>
          <div className="relative">
            <Input
              id="invite-username-or-email"
              placeholder={tTeams("searchUserPlaceholder")}
              autoComplete="off"
              aria-invalid={form.formState.errors.usernameOrEmail ? "true" : "false"}
              disabled={isPending}
              className="h-10"
              {...field}
              onFocus={() => {
                if (trimmedValue.length >= 2) setPopoverOpen(true);
              }}
              onBlur={(event) => {
                field.onBlur(event);
                window.setTimeout(() => setPopoverOpen(false), 120);
              }}
            />
            <PopoverContent className="p-0">
              <Command>
                <CommandList>
                  {isLoadingSuggestions ? (
                    <CommandEmpty>{tTeams("searchingUsers")}</CommandEmpty>
                  ) : suggestions.length === 0 ? (
                    <CommandEmpty>{tTeams("noMatchingUsers")}</CommandEmpty>
                  ) : (
                    <CommandGroup>
                      {suggestions.map((user) => (
                        <CommandItem
                          key={user.id}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            const selectedValue = user.email || user.username;
                            setSelectedUser(user);
                            form.setValue("usernameOrEmail", selectedValue, {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            });
                            setPopoverOpen(false);
                          }}
                        >
                          <Avatar className="mt-0.5 h-8 w-8">
                            <AvatarFallback className="text-[10px]">{initials(user.name ?? user.username)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {user.name ?? user.username}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              @{user.username} - {user.email}
                            </p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </div>
        </Popover>

        {form.formState.errors.usernameOrEmail ? (
          <p className="text-xs text-destructive" role="alert">
            {form.formState.errors.usernameOrEmail.message}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {tTeams("inviteHint")}
        </p>
      </div>

      <FormErrorSummary serverError={serverState.error} errors={[form.formState.errors.usernameOrEmail?.message]} />
      {serverState.success ? <p className="text-sm text-primary">{serverState.success}</p> : null}

      <Button type="submit" disabled={!canSubmit}>
        {isPending ? tTeams("sending") : tTeams("sendInvite")}
      </Button>
    </form>
  );
}
