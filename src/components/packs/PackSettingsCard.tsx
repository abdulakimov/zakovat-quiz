"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { updatePackSettingsAction, type PackActionState } from "@/src/actions/packs";
import { FormErrorSummary } from "@/src/components/form/FormErrorSummary";
import { SettingsSectionCard, SettingsSectionGroup } from "@/src/components/layout/SettingsSectionCard";
import { StickySaveBar } from "@/src/components/layout/StickySaveBar";
import { MusicPickerSheet, type MusicAsset } from "@/src/components/media/MusicPickerSheet";
import { toast } from "@/src/components/ui/sonner";
import { updatePackSettingsSchema } from "@/src/schemas/packs";
import { ClockIcon, MusicIcon } from "@/src/ui/icons";

type Props = {
  pack: {
    id: string;
    defaultQuestionTimerPresetSec: number | null;
    breakTimerSec: number;
    breakMusicAssetId: string | null;
    timerMusicAssetId: string | null;
    breakMusicAsset?: {
      id: string;
      originalName: string;
      path: string;
    } | null;
    timerMusicAsset?: {
      id: string;
      originalName: string;
      path: string;
    } | null;
  };
  audioAssets: Array<{
    id: string;
    originalName: string;
    path: string;
    sizeBytes?: number | null;
    createdAt?: string;
  }>;
};

type FormValues = {
  packId: string;
  defaultQuestionTimerPresetSec: number | null;
  breakTimerSec: number;
  breakMusicAssetId: string;
  timerMusicAssetId: string;
};

export function PackSettingsCard({ pack, audioAssets }: Props) {
  const [isPending, startTransition] = React.useTransition();
  const [serverState, setServerState] = React.useState<PackActionState>({});
  const [selectedBreakAudio, setSelectedBreakAudio] = React.useState<MusicAsset | null>(null);
  const [selectedTimerAudio, setSelectedTimerAudio] = React.useState<MusicAsset | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(updatePackSettingsSchema),
    defaultValues: {
      packId: pack.id,
      defaultQuestionTimerPresetSec: pack.defaultQuestionTimerPresetSec ?? null,
      breakTimerSec: pack.breakTimerSec,
      breakMusicAssetId: pack.breakMusicAssetId ?? "",
      timerMusicAssetId: pack.timerMusicAssetId ?? "",
    },
    mode: "onChange",
    reValidateMode: "onChange",
  });
  const selectedBreakMusicId = useWatch({ control: form.control, name: "breakMusicAssetId" });
  const selectedTimerMusicId = useWatch({ control: form.control, name: "timerMusicAssetId" });

  React.useEffect(() => {
    const initial = pack.breakMusicAssetId
      ? audioAssets.find((asset) => asset.id === pack.breakMusicAssetId) ?? null
      : null;
    if (initial) {
      setSelectedBreakAudio({
        id: initial.id,
        name: initial.originalName,
        url: `/api/media/${initial.path}`,
        sizeBytes: initial.sizeBytes ?? null,
        createdAt: initial.createdAt,
      });
      return;
    }
    if (pack.breakMusicAsset) {
      setSelectedBreakAudio({
        id: pack.breakMusicAsset.id,
        name: pack.breakMusicAsset.originalName,
        url: `/api/media/${pack.breakMusicAsset.path}`,
      });
      return;
    }
    setSelectedBreakAudio(null);
  }, [audioAssets, pack.breakMusicAsset, pack.breakMusicAssetId]);

  React.useEffect(() => {
    const initial = pack.timerMusicAssetId
      ? audioAssets.find((asset) => asset.id === pack.timerMusicAssetId) ?? null
      : null;
    if (initial) {
      setSelectedTimerAudio({
        id: initial.id,
        name: initial.originalName,
        url: `/api/media/${initial.path}`,
        sizeBytes: initial.sizeBytes ?? null,
        createdAt: initial.createdAt,
      });
      return;
    }
    if (pack.timerMusicAsset) {
      setSelectedTimerAudio({
        id: pack.timerMusicAsset.id,
        name: pack.timerMusicAsset.originalName,
        url: `/api/media/${pack.timerMusicAsset.path}`,
      });
      return;
    }
    setSelectedTimerAudio(null);
  }, [audioAssets, pack.timerMusicAsset, pack.timerMusicAssetId]);

  React.useEffect(() => {
    if (!selectedBreakMusicId) {
      if (selectedBreakAudio !== null) setSelectedBreakAudio(null);
      return;
    }
    if (selectedBreakAudio?.id === selectedBreakMusicId) return;
    const matched = audioAssets.find((asset) => asset.id === selectedBreakMusicId);
    if (matched) {
      setSelectedBreakAudio({
        id: matched.id,
        name: matched.originalName,
        url: `/api/media/${matched.path}`,
        sizeBytes: matched.sizeBytes ?? null,
        createdAt: matched.createdAt,
      });
    }
  }, [audioAssets, selectedBreakAudio, selectedBreakMusicId]);

  React.useEffect(() => {
    if (!selectedTimerMusicId) {
      if (selectedTimerAudio !== null) setSelectedTimerAudio(null);
      return;
    }
    if (selectedTimerAudio?.id === selectedTimerMusicId) return;
    const matched = audioAssets.find((asset) => asset.id === selectedTimerMusicId);
    if (matched) {
      setSelectedTimerAudio({
        id: matched.id,
        name: matched.originalName,
        url: `/api/media/${matched.path}`,
        sizeBytes: matched.sizeBytes ?? null,
        createdAt: matched.createdAt,
      });
    }
  }, [audioAssets, selectedTimerAudio, selectedTimerMusicId]);

  const canSave = form.formState.isDirty && form.formState.isValid && !isPending;
  const timerMusicName = selectedTimerAudio?.name ?? pack.timerMusicAsset?.originalName ?? null;

  const onSubmit = form.handleSubmit((values) => {
    setServerState({});
    startTransition(() => {
      void (async () => {
        const fd = new FormData();
        fd.set("packId", values.packId);
        fd.set(
          "defaultQuestionTimerPresetSec",
          values.defaultQuestionTimerPresetSec == null ? "" : String(values.defaultQuestionTimerPresetSec),
        );
        fd.set("breakTimerSec", String(values.breakTimerSec));
        fd.set("breakMusicAssetId", values.breakMusicAssetId ?? "");
        fd.set("timerMusicAssetId", values.timerMusicAssetId ?? "");
        const result = await updatePackSettingsAction({}, fd);
        setServerState(result ?? {});
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        toast.success(result?.success ?? "Pack settings updated.");
        form.reset(values);
      })();
    });
  });

  return (
    <Card id="pack-settings">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Settings</CardTitle>
        <CardDescription>Timers and music.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3" noValidate>
          <input type="hidden" {...form.register("packId")} />

          <SettingsSectionGroup>
            <SettingsSectionCard
              icon={ClockIcon}
              title="Timers"
              subtitle="Question timer preset and write answers time."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="pack-question-timer-preset" className="text-sm text-slate-500">
                    Question timer preset
                  </Label>
                  <select
                    id="pack-question-timer-preset"
                    disabled={isPending}
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    value={form.watch("defaultQuestionTimerPresetSec") == null ? "" : String(form.watch("defaultQuestionTimerPresetSec"))}
                    onChange={(e) => {
                      const next = e.target.value === "" ? null : Number(e.target.value);
                      form.setValue("defaultQuestionTimerPresetSec", next, { shouldDirty: true, shouldValidate: true });
                    }}
                  >
                    <option value="">None (use round default)</option>
                    <option value="30">30 sec</option>
                    <option value="40">40 sec</option>
                    <option value="45">45 sec</option>
                    <option value="60">60 sec</option>
                  </select>
                  {form.formState.errors.defaultQuestionTimerPresetSec ? (
                    <p className="text-xs text-red-600">{form.formState.errors.defaultQuestionTimerPresetSec.message as string}</p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pack-break-timer" className="text-sm text-slate-500">
                    Write answers time (sec)
                  </Label>
                  <Input
                    id="pack-break-timer"
                    type="number"
                    min={10}
                    max={300}
                    {...form.register("breakTimerSec", { valueAsNumber: true })}
                    disabled={isPending}
                  />
                  {form.formState.errors.breakTimerSec ? (
                    <p className="text-xs text-red-600">{form.formState.errors.breakTimerSec.message}</p>
                  ) : null}
                </div>
              </div>
            </SettingsSectionCard>

            <SettingsSectionCard
              icon={MusicIcon}
              title="Break music"
              subtitle="Played during write breaks."
            >
              <input type="hidden" {...form.register("breakMusicAssetId")} />
              <MusicPickerSheet
                title="Break music"
                value={selectedBreakAudio}
                disabled={isPending}
                onChange={(asset) => {
                  form.setValue("breakMusicAssetId", asset?.id ?? "", { shouldDirty: true, shouldValidate: true });
                  setSelectedBreakAudio(asset);
                }}
              />
            </SettingsSectionCard>

            <SettingsSectionCard
              icon={MusicIcon}
              title="Timer music"
              subtitle="Played during question timers."
            >
              <input type="hidden" {...form.register("timerMusicAssetId")} />
              <MusicPickerSheet
                title="Timer music"
                value={selectedTimerAudio}
                disabled={isPending}
                onChange={(asset) => {
                  form.setValue("timerMusicAssetId", asset?.id ?? "", { shouldDirty: true, shouldValidate: true });
                  setSelectedTimerAudio(asset);
                }}
              />
              <div className="flex items-center gap-2 text-xs text-slate-500">
                {timerMusicName ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex max-w-full items-center gap-2">
                          <MusicIcon className="h-3.5 w-3.5" aria-hidden />
                          <span className="max-w-[200px] truncate text-slate-700">{timerMusicName}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>{timerMusicName}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <span>No music selected</span>
                )}
              </div>
            </SettingsSectionCard>
          </SettingsSectionGroup>

          <FormErrorSummary
            serverError={serverState.error}
            errors={[
              form.formState.errors.defaultQuestionTimerPresetSec?.message as string | undefined,
              form.formState.errors.breakTimerSec?.message,
              form.formState.errors.breakMusicAssetId?.message as string | undefined,
              form.formState.errors.timerMusicAssetId?.message as string | undefined,
            ]}
          />

          {form.formState.isDirty && !form.formState.isValid ? (
            <p className="text-xs text-red-600">Fix validation errors to save.</p>
          ) : null}

          <StickySaveBar
            dirty={form.formState.isDirty}
            pending={isPending}
            canSave={canSave}
          />
        </form>
      </CardContent>
    </Card>
  );
}
