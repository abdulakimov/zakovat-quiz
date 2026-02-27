"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StickySaveBar({
  dirty,
  pending,
  canSave,
  onCancel,
  formId,
  className,
}: {
  dirty: boolean;
  pending?: boolean;
  canSave: boolean;
  onCancel?: () => void;
  formId?: string;
  className?: string;
}) {
  const tCommon = useTranslations("common");
  if (!dirty) return null;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:static md:border md:border-border md:rounded-lg",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">{tCommon("unsavedChanges")}</p>
        <div className="flex items-center gap-2">
          {onCancel ? (
            <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onCancel}>
              {tCommon("cancel")}
            </Button>
          ) : null}
          <Button type="submit" size="sm" disabled={!canSave} form={formId}>
            {pending ? tCommon("saving") : tCommon("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
