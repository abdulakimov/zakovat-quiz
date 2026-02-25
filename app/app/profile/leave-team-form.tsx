"use client";

import * as React from "react";
import { leaveTeam, type TeamActionState } from "@/app/app/teams/actions";
import { Button } from "@/components/ui/button";

const initialState: TeamActionState = {};

export function LeaveTeamForm({ teamId }: { teamId: string }) {
  const [state, formAction] = React.useActionState(leaveTeam, initialState);

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <input type="hidden" name="teamId" value={teamId} />
        <Button type="submit" variant="outline" size="sm">
          Leave
        </Button>
      </form>
      {state.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-xs text-green-700">{state.success}</p> : null}
    </div>
  );
}