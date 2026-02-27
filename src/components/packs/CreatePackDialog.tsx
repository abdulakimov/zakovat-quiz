"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPackAction, type PackActionState } from "@/src/actions/packs";
import { FormErrorSummary } from "@/src/components/form/FormErrorSummary";
import { FormFieldText } from "@/src/components/form/FormFieldText";
import { localizeHref, normalizeLocale } from "@/src/i18n/config";
import { useTranslations } from "@/src/i18n/client";
import { toast } from "@/src/components/ui/sonner";
import { createPackSchema, type CreatePackInput } from "@/src/schemas/packs";
import { PlusIcon } from "@/src/ui/icons";
import { packVisibilityLabel } from "@/src/i18n/labels";

export function CreatePackDialog() {
  const tCommon = useTranslations("common");
  const tPacks = useTranslations("packs");
  const router = useRouter();
  const locale = normalizeLocale(useLocale());
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [serverState, setServerState] = React.useState<PackActionState>({});

  const form = useForm<CreatePackInput>({
    resolver: zodResolver(createPackSchema),
    defaultValues: {
      title: "",
      description: "",
      visibility: "DRAFT",
    },
  });
  const descriptionValue = useWatch({ control: form.control, name: "description" }) ?? "";

  const onSubmit = form.handleSubmit((values) => {
    setServerState({});
    startTransition(() => {
      void (async () => {
        const fd = new FormData();
        fd.set("title", values.title);
        fd.set("description", values.description ?? "");
        fd.set("visibility", values.visibility ?? "DRAFT");
        const result = await createPackAction({}, fd);
        setServerState(result ?? {});
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        toast.success(result?.success ?? tPacks("toastCreated"));
        setOpen(false);
        form.reset({ title: "", description: "", visibility: "DRAFT" });
        if (result?.packId) {
          router.push(localizeHref(locale, `/app/packs/${result.packId}`));
          router.refresh();
        }
      })();
    });
  });

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <PlusIcon className="mr-2 h-4 w-4" aria-hidden />
        {tPacks("createButton")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{tPacks("createDialog.title")}</DialogTitle>
            <DialogDescription>{tPacks("createDialog.description")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <FormFieldText
              id="pack-title"
              name="title"
              label={tPacks("form.titleLabel")}
              placeholder={tPacks("form.titlePlaceholder")}
              register={form.register}
              error={form.formState.errors.title}
              disabled={isPending}
            />

            <div className="space-y-2">
              <Label htmlFor="pack-description">{tPacks("form.descriptionLabel")}</Label>
              <Textarea
                id="pack-description"
                rows={3}
                maxLength={240}
                placeholder={tPacks("form.descriptionPlaceholder")}
                {...form.register("description")}
                disabled={isPending}
              />
              {form.formState.errors.description ? (
                <p className="text-sm text-destructive">{form.formState.errors.description.message as string}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">{descriptionValue.length}/240</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pack-visibility">{tPacks("form.visibilityLabel")}</Label>
              <select
                id="pack-visibility"
                {...form.register("visibility")}
                disabled={isPending}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="DRAFT">{packVisibilityLabel(tPacks, "DRAFT")}</option>
                <option value="PRIVATE">{packVisibilityLabel(tPacks, "PRIVATE")}</option>
                <option value="PUBLIC">{packVisibilityLabel(tPacks, "PUBLIC")}</option>
              </select>
            </div>

            <FormErrorSummary
              serverError={serverState.error}
              errors={[
                form.formState.errors.title?.message,
                form.formState.errors.description?.message as string | undefined,
                form.formState.errors.visibility?.message,
              ]}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={isPending} onClick={() => setOpen(false)}>
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? tPacks("createDialog.creating") : tPacks("createDialog.create")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
