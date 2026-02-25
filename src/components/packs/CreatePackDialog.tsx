"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPackAction, type PackActionState } from "@/src/actions/packs";
import { FormErrorSummary } from "@/src/components/form/FormErrorSummary";
import { FormFieldText } from "@/src/components/form/FormFieldText";
import { toast } from "@/src/components/ui/sonner";
import { createPackSchema, type CreatePackInput } from "@/src/schemas/packs";
import { PlusIcon } from "@/src/ui/icons";

export function CreatePackDialog() {
  const router = useRouter();
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
        fd.set("visibility", values.visibility);
        const result = await createPackAction({}, fd);
        setServerState(result ?? {});
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        toast.success(result?.success ?? "Pack created.");
        setOpen(false);
        form.reset({ title: "", description: "", visibility: "DRAFT" });
        if (result?.packId) {
          router.push(`/app/packs/${result.packId}`);
          router.refresh();
        }
      })();
    });
  });

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <PlusIcon className="mr-2 h-4 w-4" aria-hidden />
        Create pack
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create pack</DialogTitle>
            <DialogDescription>Create a quiz pack and configure rounds next.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <FormFieldText
              id="pack-title"
              name="title"
              label="Title"
              placeholder="Zakovat Friday #12"
              register={form.register}
              error={form.formState.errors.title}
              disabled={isPending}
            />

            <div className="space-y-2">
              <Label htmlFor="pack-description">Description</Label>
              <Textarea
                id="pack-description"
                rows={3}
                maxLength={240}
                placeholder="Optional short description"
                {...form.register("description")}
                disabled={isPending}
              />
              {form.formState.errors.description ? (
                <p className="text-sm text-red-600">{form.formState.errors.description.message as string}</p>
              ) : null}
              <p className="text-xs text-slate-500">{descriptionValue.length}/240</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pack-visibility">Visibility</Label>
              <select
                id="pack-visibility"
                {...form.register("visibility")}
                disabled={isPending}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900"
              >
                <option value="DRAFT">Draft</option>
                <option value="PRIVATE">Private</option>
                <option value="PUBLIC">Public</option>
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
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create pack"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
