"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ActionGroup } from "@/src/components/ui/action-group";
import { IconButton } from "@/src/components/ui/icon-button";
import { removeMemberAction } from "@/src/actions/teams";
import { useTranslations } from "@/src/i18n/client";
import { toast } from "@/src/components/ui/sonner";
import { CrownIcon, TrashIcon } from "@/src/ui/icons";

type Props = {
  teamId: string;
  memberId: string;
  memberLabel: string;
};

export function MemberRowActions({ teamId, memberId, memberLabel }: Props) {
  const tTeams = useTranslations("teams");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [removeOpen, setRemoveOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  function handleRemove() {
    startTransition(() => {
      void (async () => {
        const fd = new FormData();
        fd.set("teamId", teamId);
        fd.set("memberId", memberId);
        const result = await removeMemberAction({}, fd);
        if (result?.error) toast.error(result.error);
        if (result?.success) {
          toast.success(result.success);
          setRemoveOpen(false);
          router.refresh();
        }
      })();
    });
  }

  return (
    <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
      <ActionGroup>
        <IconButton label={tTeams("transferOwnership")} tooltip={tCommon("comingSoon")} disabled>
          <CrownIcon className="h-4 w-4" />
        </IconButton>
        <IconButton
          label={tTeams("removeMember")}
          tooltip={tTeams("remove")}
          className="text-red-600 hover:text-red-700"
          onClick={() => setRemoveOpen(true)}
        >
          <TrashIcon className="h-4 w-4" />
        </IconButton>
      </ActionGroup>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{tTeams("removeMemberConfirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {tTeams("removeMemberConfirmDescription", { memberLabel })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button type="button" variant="outline" disabled={isPending}>
              {tCommon("cancel")}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              type="button"
              className="bg-red-700 text-white hover:bg-red-800"
              disabled={isPending}
              onClick={handleRemove}
            >
              {isPending ? tTeams("removing") : tTeams("remove")}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
