"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { updateTeamSettingsAction, type TeamActionState } from "@/src/actions/teams";
import { FormErrorSummary } from "@/src/components/form/FormErrorSummary";
import { useTranslations } from "@/src/i18n/client";
import { SettingsSectionCard, SettingsSectionGroup } from "@/src/components/layout/SettingsSectionCard";
import { StickySaveBar } from "@/src/components/layout/StickySaveBar";
import { toast } from "@/src/components/ui/sonner";
import { PencilIcon, SettingsIcon } from "@/src/ui/icons";
import { updateTeamSettingsSchema } from "@/src/schemas/teams";

type Props = {
  team: {
    id: string;
    name: string;
    slogan: string | null;
    avatarAsset?: { path: string } | null;
    avatarAssetId?: string | null;
  };
};

type FormValues = {
  teamId: string;
  name: string;
  slogan: string;
  avatarAssetId: string;
};

type UploadResponse = { assetId: string; url: string };

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function uploadTeamAvatar(teamId: string, file: File, onProgress: (percent: number) => void) {
  return new Promise<UploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/uploads/team-avatar");
    xhr.responseType = "json";
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => reject(new Error("upload-error"));
    xhr.onload = () => {
      const data = xhr.response as { error?: string; assetId?: string; url?: string } | null;
      if (xhr.status >= 200 && xhr.status < 300 && data?.assetId && data?.url) {
        resolve({ assetId: data.assetId, url: data.url });
        return;
      }
      reject(new Error(data?.error || "upload-error"));
    };
    const body = new FormData();
    body.set("teamId", teamId);
    body.set("file", file);
    xhr.send(body);
  });
}

export function TeamSettingsCard({ team }: Props) {
  const tTeams = useTranslations("teams");
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isSaving, startTransition] = React.useTransition();
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [isEditing, setIsEditing] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(
    team.avatarAsset?.path ? `/api/media/${team.avatarAsset.path}` : null,
  );
  const [serverState, setServerState] = React.useState<TeamActionState>({});

  const form = useForm<FormValues>({
    resolver: zodResolver(updateTeamSettingsSchema),
    defaultValues: {
      teamId: team.id,
      name: team.name,
      slogan: team.slogan ?? "",
      avatarAssetId: team.avatarAssetId ?? "",
    },
    mode: "onChange",
  });

  React.useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const sloganValue = form.watch("slogan") ?? "";
  const canSave = isEditing && form.formState.isDirty && form.formState.isValid && !isSaving && !isUploading;
  const fieldsDisabled = !isEditing || isSaving || isUploading;
  const watchedName = form.watch("name")?.trim() || team.name;

  function resetDraft() {
    form.reset({
      teamId: team.id,
      name: team.name,
      slogan: team.slogan ?? "",
      avatarAssetId: team.avatarAssetId ?? "",
    });
    setPreviewUrl(team.avatarAsset?.path ? `/api/media/${team.avatarAsset.path}` : null);
    setServerState({});
  }

  const onUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setServerState({});
    setIsUploading(true);
    setUploadProgress(0);

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return localPreview;
    });

    try {
      const uploaded = await uploadTeamAvatar(team.id, file, setUploadProgress);
      form.setValue("avatarAssetId", uploaded.assetId, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
      setPreviewUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return uploaded.url;
      });
      toast.success(tTeams("avatarUploaded"));
    } catch (error) {
      setPreviewUrl(team.avatarAsset?.path ? `/api/media/${team.avatarAsset.path}` : null);
      toast.error(error instanceof Error && error.message !== "upload-error" ? error.message : tTeams("uploadFailed"));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (event.target) event.target.value = "";
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    setServerState({});
    startTransition(() => {
      void (async () => {
        const fd = new FormData();
        fd.set("teamId", values.teamId);
        fd.set("name", values.name);
        fd.set("slogan", values.slogan ?? "");
        fd.set("avatarAssetId", values.avatarAssetId ?? "");
        const result = await updateTeamSettingsAction({}, fd);
        setServerState(result ?? {});
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        toast.success(result?.success ?? tTeams("settingsUpdated"));
        form.reset({
          teamId: values.teamId,
          name: values.name,
          slogan: values.slogan ?? "",
          avatarAssetId: values.avatarAssetId ?? "",
        });
        setIsEditing(false);
        router.refresh();
      })();
    });
  });

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">{tTeams("teamSettings")}</CardTitle>
              <CardDescription>{tTeams("settingsDescription")}</CardDescription>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => {
                    if (isEditing) {
                      resetDraft();
                      setIsEditing(false);
                      return;
                    }
                    setIsEditing(true);
                  }}
                >
                  <PencilIcon className="h-4 w-4" />
                  <span className="sr-only">{isEditing ? tTeams("cancelEditing") : tTeams("editTeamSettings")}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isEditing ? tTeams("cancelEditing") : tTeams("editTeamSettings")}</TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <input type="hidden" {...form.register("teamId")} />
            <input type="hidden" {...form.register("avatarAssetId")} />

            <SettingsSectionGroup>
              <SettingsSectionCard
                icon={SettingsIcon}
                title={tTeams("teamProfile")}
                subtitle={tTeams("teamProfileSubtitle")}
              >
                <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="space-y-3 rounded-lg border border-border p-4">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <Avatar className="h-20 w-20 rounded-2xl border-border">
                        {previewUrl ? <AvatarImage src={previewUrl} alt={watchedName} className="rounded-2xl" /> : null}
                        {!previewUrl ? (
                          <AvatarFallback className="rounded-2xl text-lg">{getInitials(watchedName)}</AvatarFallback>
                        ) : null}
                      </Avatar>
                      <p className="text-sm font-medium text-foreground">{watchedName}</p>
                    </div>
                    <div className="space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={onUpload}
                        disabled={fieldsDisabled}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={fieldsDisabled}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {isUploading ? tTeams("uploadingWithProgress", { progress: uploadProgress }) : tTeams("uploadAvatar")}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        {tTeams("imageHint")} {!isEditing ? tTeams("clickEditToChange") : ""}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="team-settings-name" className="text-sm text-muted-foreground">{tTeams("teamNameLabel")}</Label>
                      <Input
                        id="team-settings-name"
                        {...form.register("name")}
                        disabled={fieldsDisabled}
                        aria-invalid={form.formState.errors.name ? "true" : "false"}
                        className={cn("h-10", form.formState.errors.name ? "border-destructive focus-visible:ring-destructive" : "")}
                      />
                      {form.formState.errors.name ? (
                        <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="team-settings-slogan" className="text-sm text-muted-foreground">{tTeams("teamSloganLabel")}</Label>
                        <span className="text-xs text-muted-foreground">{sloganValue.length}/80</span>
                      </div>
                      <Textarea
                        id="team-settings-slogan"
                        rows={2}
                        maxLength={80}
                        placeholder={tTeams("teamSloganPlaceholder")}
                        {...form.register("slogan")}
                        disabled={fieldsDisabled}
                        aria-invalid={form.formState.errors.slogan ? "true" : "false"}
                        className={cn(
                          "min-h-[72px] resize-none",
                          form.formState.errors.slogan ? "border-destructive focus-visible:ring-destructive" : "",
                        )}
                      />
                      {form.formState.errors.slogan ? (
                        <p className="text-xs text-destructive">{form.formState.errors.slogan.message as string}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </SettingsSectionCard>
            </SettingsSectionGroup>

            <FormErrorSummary
              serverError={serverState.error}
              errors={[
                form.formState.errors.name?.message,
                form.formState.errors.slogan?.message as string | undefined,
                form.formState.errors.avatarAssetId?.message as string | undefined,
              ]}
            />

            <StickySaveBar
              dirty={form.formState.isDirty && isEditing}
              pending={isSaving || isUploading}
              canSave={canSave}
              onCancel={() => {
                resetDraft();
                setIsEditing(false);
              }}
            />
          </form>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
