"use client";

import * as React from "react";
import { acceptInvite, declineInvite, type TeamActionState } from "@/src/actions/teams";
import { Button } from "@/components/ui/button";

const initialState: TeamActionState = {};

export function InviteActions({ inviteId }: { inviteId: string }) {
  const [acceptState, acceptAction] = React.useActionState(acceptInvite, initialState);
  const [declineState, declineAction] = React.useActionState(declineInvite, initialState);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <form action={acceptAction}>
          <input type="hidden" name="inviteId" value={inviteId} />
          <Button type="submit" size="sm">Accept</Button>
        </form>
        <form action={declineAction}>
          <input type="hidden" name="inviteId" value={inviteId} />
          <Button type="submit" variant="outline" size="sm">Decline</Button>
        </form>
      </div>
      {acceptState.error ? <p className="text-xs text-red-600">{acceptState.error}</p> : null}
      {acceptState.success ? <p className="text-xs text-green-700">{acceptState.success}</p> : null}
      {declineState.error ? <p className="text-xs text-red-600">{declineState.error}</p> : null}
      {declineState.success ? <p className="text-xs text-green-700">{declineState.success}</p> : null}
    </div>
  );
}
