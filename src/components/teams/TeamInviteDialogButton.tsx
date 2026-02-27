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
import { useTranslations } from "@/src/i18n/client";
import { InviteMemberForm } from "@/src/components/teams/InviteMemberForm";
import { UserPlusIcon } from "@/src/ui/icons";

type Props = {
  teamId: string;
  teamName: string;
};

export function TeamInviteDialogButton({ teamId, teamName }: Props) {
  const tTeams = useTranslations("teams");
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <IconButton label={tTeams("inviteMember")} tooltip={tTeams("inviteMember")}>
          <UserPlusIcon className="h-4 w-4" />
        </IconButton>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{tTeams("inviteMember")}</DialogTitle>
          <DialogDescription>
            {tTeams("inviteToTeam", { teamName })}
          </DialogDescription>
        </DialogHeader>
        <InviteMemberForm teamId={teamId} />
      </DialogContent>
    </Dialog>
  );
}
