"use client";

import * as React from "react";
import { ActionGroup } from "@/src/components/ui/action-group";
import { IconButton } from "@/src/components/ui/icon-button";
import { cancelInvite, resendInvite } from "@/src/actions/teams";
import { useTranslations } from "@/src/i18n/client";
import { toast } from "@/src/components/ui/sonner";
import { RotateCcwIcon, TrashIcon } from "@/src/ui/icons";

export function PendingInviteActions({ inviteId }: { inviteId: string }) {
  const tTeams = useTranslations("teams");
  const [pending, setPending] = React.useState<"resend" | "cancel" | null>(null);
  const [, startTransition] = React.useTransition();

  const run = (action: "resend" | "cancel") => {
    setPending(action);
    startTransition(() => {
      void (async () => {
        try {
          const fd = new FormData();
          fd.set("inviteId", inviteId);
          const result = action === "resend" ? await resendInvite({}, fd) : await cancelInvite({}, fd);
          if (result?.error) toast.error(result.error);
          if (result?.success) toast.success(result.success);
        } finally {
          setPending(null);
        }
      })();
    });
  };

  return (
    <ActionGroup className="w-full justify-end sm:w-auto">
      <IconButton
        label={tTeams("resendInvite")}
        tooltip={pending === "resend" ? tTeams("resending") : tTeams("resend")}
        disabled={pending !== null}
        onClick={() => run("resend")}
      >
        <RotateCcwIcon className="h-4 w-4" />
      </IconButton>
      <IconButton
        label={tTeams("cancelInvite")}
        tooltip={pending === "cancel" ? tTeams("canceling") : tTeams("cancelInviteShort")}
        className="text-red-600 hover:text-red-700"
        disabled={pending !== null}
        onClick={() => run("cancel")}
      >
        <TrashIcon className="h-4 w-4" />
      </IconButton>
    </ActionGroup>
  );
}
