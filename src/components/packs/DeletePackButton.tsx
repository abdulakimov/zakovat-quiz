"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
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
import { localizeHref, normalizeLocale } from "@/src/i18n/config";
import { useTranslations } from "@/src/i18n/client";
import { toast } from "@/src/components/ui/sonner";

export function DeletePackButton({ packId, packTitle }: { packId: string; packTitle: string }) {
  const tCommon = useTranslations("common");
  const tPacks = useTranslations("packs");
  const router = useRouter();
  const locale = normalizeLocale(useLocale());
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [isPending, startTransition] = React.useTransition();
  const canDelete = value.trim() === packTitle;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-50">
          {tCommon("delete")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-700">{tPacks("delete.confirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{tPacks("delete.confirmDescription")}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="delete-pack-confirm">{tPacks("delete.typeToConfirm", { title: packTitle })}</Label>
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
              {tCommon("cancel")}
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
                    toast.success(result?.success ?? tPacks("delete.deletedToast"));
                    setOpen(false);
                    router.push(localizeHref(locale, "/app/packs"));
                    router.refresh();
                  })();
                });
              }}
            >
              {isPending ? tPacks("delete.deleting") : tPacks("delete.deleteButton")}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
