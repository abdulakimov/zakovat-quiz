"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { IconButton } from "@/src/components/ui/icon-button";
import { InviteMemberForm } from "@/src/components/teams/InviteMemberForm";
import { UserPlusIcon } from "@/src/ui/icons";

type Props = {
  teamId: string;
  teamName: string;
};

export function TeamInviteDialogButton({ teamId, teamName }: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <IconButton label="Invite member" tooltip="Invite member">
          <UserPlusIcon className="h-4 w-4" />
        </IconButton>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Invite member</DialogTitle>
          <DialogDescription>
            Invite a teammate to <span className="font-medium text-slate-900">{teamName}</span>.
          </DialogDescription>
        </DialogHeader>
        <InviteMemberForm teamId={teamId} />
      </DialogContent>
    </Dialog>
  );
}
