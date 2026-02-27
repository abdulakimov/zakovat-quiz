"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { renameTeam, type TeamActionState } from "@/src/actions/teams";
import { FormErrorSummary } from "@/src/components/form/FormErrorSummary";
import { FormFieldText } from "@/src/components/form/FormFieldText";
import { toast } from "@/src/components/ui/sonner";
import { renameTeamSchema } from "@/src/schemas/teams";

type Props = {
  teamId: string;
  initialName: string;
};

export function RenameTeamForm({ teamId, initialName }: Props) {
  const [isPending, startTransition] = React.useTransition();
  const [serverState, setServerState] = React.useState<TeamActionState>({});
  const form = useForm({
    resolver: zodResolver(renameTeamSchema.pick({ name: true })),
    defaultValues: { name: initialName },
  });

  const onSubmit = form.handleSubmit((values) => {
    setServerState({});
    startTransition(() => {
      void (async () => {
        const fd = new FormData();
        fd.set("teamId", teamId);
        fd.set("name", values.name);
        const result = await renameTeam({}, fd);
        setServerState(result ?? {});
        if (result?.error) toast.error(result.error);
        if (result?.success) toast.success(result.success);
      })();
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm" noValidate>
      <FormFieldText
        id="rename-team-name"
        name="name"
        label="Rename team"
        register={form.register}
        error={form.formState.errors.name}
        disabled={isPending}
      />
      <FormErrorSummary serverError={serverState.error} errors={[form.formState.errors.name?.message]} />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
