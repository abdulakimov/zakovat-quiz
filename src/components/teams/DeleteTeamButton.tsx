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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteTeam } from "@/src/actions/teams";
import { toast } from "@/src/components/ui/sonner";

type DeleteTeamButtonProps = {
  teamId: string;
  teamName: string;
};

export function DeleteTeamButton({ teamId, teamName }: DeleteTeamButtonProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState("");
  const [isSubmitting, startTransition] = React.useTransition();
  const isConfirmed = confirmation.trim() === teamName;

  const submitDelete = () => {
    if (!isConfirmed || isSubmitting) return;

    startTransition(() => {
      void (async () => {
        try {
          const fd = new FormData();
          fd.set("teamId", teamId);
          const result = await deleteTeam(fd);

          if (result?.error) {
            toast.error(result.error);
            return;
          }

          toast.success(result?.success ?? "Team deleted.");
          setOpen(false);
          router.push("/app/teams");
          router.refresh();
        } catch {
          toast.error("Failed to delete team.");
        }
      })();
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
        >
          Delete team
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-700">Delete team?</AlertDialogTitle>
          <AlertDialogDescription>
            This action is irreversible. The team, members, and pending invites will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="delete-team-confirm" className="text-sm text-slate-700">
            Type <span className="font-semibold">{teamName}</span> to confirm
          </Label>
          <Input
            id="delete-team-confirm"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={teamName}
            autoComplete="off"
            disabled={isSubmitting}
            className="border-red-200 focus-visible:ring-red-300"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button type="button" variant="outline" size="sm" disabled={isSubmitting}>
              Cancel
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              type="button"
              size="sm"
              disabled={!isConfirmed || isSubmitting}
              onClick={submitDelete}
              className="bg-red-700 text-white hover:bg-red-800"
            >
              {isSubmitting ? "Deleting..." : "Delete permanently"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
