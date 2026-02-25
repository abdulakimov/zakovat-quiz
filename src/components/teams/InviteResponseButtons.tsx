"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { acceptInvite, declineInvite } from "@/src/actions/teams";
import { toast } from "@/src/components/ui/sonner";
import { CheckIcon } from "@/src/ui/icons";

export function InviteResponseButtons({ inviteId }: { inviteId: string }) {
  const [pendingAction, setPendingAction] = React.useState<"accept" | "decline" | null>(null);
  const [, startTransition] = React.useTransition();

  function run(action: "accept" | "decline") {
    setPendingAction(action);
    startTransition(() => {
      void (async () => {
        try {
          const fd = new FormData();
          fd.set("inviteId", inviteId);
          const result = action === "accept" ? await acceptInvite({}, fd) : await declineInvite({}, fd);
          if (result?.error) {
            if (result.code === "TEAM_LIMIT_2") {
              toast.error("You already have 2 active teams. Leave one team before accepting another invite.");
            } else if (result.code === "INVITE_EXPIRED") {
              toast.error("Invite expired. Ask the team owner to resend the invitation.");
            } else {
              toast.error(result.error);
            }
          }
          if (result?.success) toast.success(result.success);
        } finally {
          setPendingAction(null);
        }
      })();
    });
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
      <Button
        type="button"
        size="sm"
        className="w-full sm:w-auto"
        disabled={pendingAction !== null}
        onClick={() => run("accept")}
      >
        <CheckIcon className="mr-2 h-4 w-4" aria-hidden />
        {pendingAction === "accept" ? "Accepting..." : "Accept"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full sm:w-auto"
        disabled={pendingAction !== null}
        onClick={() => run("decline")}
      >
        {pendingAction === "decline" ? "Declining..." : "Decline"}
      </Button>
    </div>
  );
}
