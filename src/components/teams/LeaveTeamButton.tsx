"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { leaveTeam } from "@/src/actions/teams";
import { useTranslations } from "@/src/i18n/client";
import { toast } from "@/src/components/ui/sonner";

export function LeaveTeamButton({ teamId }: { teamId: string }) {
  const tTeams = useTranslations("teams");
  const [isPending, startTransition] = React.useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      onClick={() => {
        startTransition(() => {
          void (async () => {
            const fd = new FormData();
            fd.set("teamId", teamId);
            const result = await leaveTeam({}, fd);
            if (result?.error) toast.error(result.error);
            if (result?.success) toast.success(result.success);
          })();
        });
      }}
    >
      {isPending ? tTeams("leaving") : tTeams("leaveTeam")}
    </Button>
  );
}
