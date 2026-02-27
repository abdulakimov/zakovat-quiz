"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { createTeam, type TeamActionState } from "@/src/actions/teams";
import { FormErrorSummary } from "@/src/components/form/FormErrorSummary";
import { useTranslations } from "@/src/i18n/client";
import { FormFieldText } from "@/src/components/form/FormFieldText";
import { toast } from "@/src/components/ui/sonner";
import { createTeamSchema, type CreateTeamInput } from "@/src/schemas/teams";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@/src/ui/icons";

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

export function CreateTeamDialog() {
  const tTeams = useTranslations("teams");
  const tCommon = useTranslations("common");
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [serverState, setServerState] = React.useState<TeamActionState>({});

  const form = useForm<CreateTeamInput>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: { name: "" },
  });

  const close = () => setIsOpen(false);
  const open = () => setIsOpen(true);

  const onSubmit = form.handleSubmit((values) => {
    setServerState({});

    startTransition(() => {
      void (async () => {
        try {
          const fd = new FormData();
          fd.set("name", values.name);
          const result = await createTeam({}, fd);
          setServerState(result ?? {});
          if (result?.error) toast.error(result.error);
          if (result?.success) toast.success(result.success);
          if (!result?.error) close();
        } catch (error) {
          if (isRedirectError(error)) throw error;
          const message = tTeams("createUnavailable");
          setServerState({ error: message });
          toast.error(message);
        }
      })();
    });
  });

  return (
    <>
      <Button type="button" onClick={open}>
        <PlusIcon className="mr-2 h-4 w-4" aria-hidden />
        {tTeams("create")}
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-foreground">{tTeams("create")}</h2>
              <p className="text-sm text-muted-foreground">{tTeams("createDescription")}</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <FormFieldText
                id="create-team-name"
                name="name"
                label={tTeams("teamNameLabel")}
                register={form.register}
                error={form.formState.errors.name}
                disabled={isPending}
                placeholder={tTeams("teamNamePlaceholder")}
              />
              <FormErrorSummary
                serverError={serverState.error}
                errors={[form.formState.errors.name?.message]}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" disabled={isPending} onClick={close}>
                  {tCommon("cancel")}
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? tTeams("creating") : tTeams("createAction")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
