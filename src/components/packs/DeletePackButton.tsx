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
import { deletePackAction } from "@/src/actions/packs";
import { toast } from "@/src/components/ui/sonner";

export function DeletePackButton({ packId, packTitle }: { packId: string; packTitle: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [isPending, startTransition] = React.useTransition();
  const canDelete = value.trim() === packTitle;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-50">
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-700">Delete pack?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the pack, rounds, questions, and linked options/media mappings.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="delete-pack-confirm">
            Type <span className="font-semibold">{packTitle}</span> to confirm
          </Label>
          <Input
            id="delete-pack-confirm"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={isPending}
            autoComplete="off"
            placeholder={packTitle}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button type="button" variant="outline" size="sm" disabled={isPending}>
              Cancel
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              type="button"
              size="sm"
              className="bg-red-700 text-white hover:bg-red-800"
              disabled={!canDelete || isPending}
              onClick={() => {
                startTransition(() => {
                  void (async () => {
                    const fd = new FormData();
                    fd.set("packId", packId);
                    const result = await deletePackAction(fd);
                    if (result?.error) {
                      toast.error(result.error);
                      return;
                    }
                    toast.success(result?.success ?? "Pack deleted.");
                    setOpen(false);
                    router.push("/app/packs");
                    router.refresh();
                  })();
                });
              }}
            >
              {isPending ? "Deleting..." : "Delete pack"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
