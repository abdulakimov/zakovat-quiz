"use client";

import * as React from "react";
import { createTeam, type TeamActionState } from "@/src/actions/teams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: TeamActionState = {};

export default function CreateTeamForm() {
  const [state, formAction] = React.useActionState(createTeam, initialState);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="space-y-2">
        <Label htmlFor="team-name">Team name</Label>
        <Input id="team-name" name="name" placeholder="e.g. Zakovat Squad" required />
      </div>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <Button type="submit">Create team</Button>
    </form>
  );
}
