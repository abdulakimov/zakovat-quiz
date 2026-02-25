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
import { cn } from "@/lib/utils";
import { FormErrorSummary } from "@/src/components/form/FormErrorSummary";
import { SettingsSectionCard, SettingsSectionGroup } from "@/src/components/layout/SettingsSectionCard";
import { StickySaveBar } from "@/src/components/layout/StickySaveBar";
import { FormFieldText } from "@/src/components/form/FormFieldText";
import { changePasswordAction, updateProfileAction } from "@/src/actions/profile";
import { toast } from "@/src/components/ui/sonner";
import { EyeIcon, EyeOffIcon, PencilIcon, UserIconLucide, ShieldIcon } from "@/src/ui/icons";
import {
  changePasswordSchema,
  updateProfileSchema,
  type ChangePasswordInput,
  type UpdateProfileInput,
} from "@/src/schemas/profile";

type Props = {
  user: {
    id: string;
    username: string;
    name: string | null;
    email?: string | null;
    displayName?: string | null;
    avatarAssetId?: string | null;
    avatarAsset?: { path: string } | null;
  };
};

type UploadResponse = {
  assetId: string;
  url: string;
};

function initials(user: Props["user"]) {
  const source = user.displayName?.trim() || user.name?.trim() || user.username;
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function uploadAvatar(file: File, onProgress: (percent: number) => void) {
  return new Promise<UploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/uploads/avatar");
    xhr.responseType = "json";

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
      onProgress(percent);
    };

    xhr.onerror = () => reject(new Error("Upload failed."));
    xhr.onload = () => {
      const status = xhr.status;
      const data = xhr.response as { error?: string; assetId?: string; url?: string } | null;
      if (status >= 200 && status < 300 && data?.assetId && data?.url) {
        resolve({ assetId: data.assetId, url: data.url });
        return;
      }
      reject(new Error(data?.error || "Upload failed."));
    };

    const formData = new FormData();
    formData.set("file", file);
    xhr.send(formData);
  });
}

export function ProfileSettingsForm({ user }: Props) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isSaving, startTransition] = React.useTransition();
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(
    user.avatarAsset?.path ? `/api/media/${user.avatarAsset.path}` : null,
  );
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = React.useState<Record<string, string[] | undefined>>({});
  const [isProfileEditing, setIsProfileEditing] = React.useState(false);

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user.name ?? "",
      username: user.username,
      displayName: user.displayName ?? "",
      avatarAssetId: user.avatarAssetId ?? "",
    },
    mode: "onChange",
  });

  React.useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  React.useEffect(() => {
    form.reset({
      name: user.name ?? "",
      username: user.username,
      displayName: user.displayName ?? "",
      avatarAssetId: user.avatarAssetId ?? "",
    });
  }, [form, user.name, user.username, user.displayName, user.avatarAssetId]);

  const onSelectFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setServerError(null);
    setUploadProgress(0);
    setIsUploading(true);

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return localPreview;
    });

    try {
      const result = await uploadAvatar(file, setUploadProgress);
      form.setValue("avatarAssetId", result.assetId, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      setPreviewUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return result.url;
      });
      toast.success("Photo uploaded. Save changes to apply it.");
    } catch (error) {
      setPreviewUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return user.avatarAsset?.path ? `/api/media/${user.avatarAsset.path}` : null;
      });
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    setServerFieldErrors({});

    startTransition(() => {
      void (async () => {
        const result = await updateProfileAction({
          name: values.name ?? "",
          username: values.username ?? "",
          displayName: values.displayName ?? "",
          avatarAssetId: values.avatarAssetId ?? "",
        });

        if (!result.ok) {
          setServerError(result.error);
          setServerFieldErrors(result.fieldErrors ?? {});
          toast.error(result.error);
          return;
        }

        toast.success(result.data.success);
        form.reset({
          name: result.data.name ?? "",
          username: result.data.username,
          displayName: result.data.displayName ?? "",
          avatarAssetId: result.data.avatarAssetId ?? "",
        });
        setIsProfileEditing(false);
        setServerError(null);
        setServerFieldErrors({});
        setPreviewUrl(result.data.avatarUrl);
        router.refresh();
      })();
    });
  });


  const watchedUsername = form.watch("username")?.trim() || user.username;
  const watchedName = form.watch("name")?.trim() || user.name || null;
  const displayNameValue = form.watch("displayName")?.trim() || user.displayName || watchedName || watchedUsername;
  const profileInputsDisabled = !isProfileEditing || isSaving || isUploading;

  function resetProfileDraft() {
    form.reset({
      name: user.name ?? "",
      username: user.username,
      displayName: user.displayName ?? "",
      avatarAssetId: user.avatarAssetId ?? "",
    });
    setPreviewUrl(user.avatarAsset?.path ? `/api/media/${user.avatarAsset.path}` : null);
    setServerError(null);
    setServerFieldErrors({});
  }


  return (
    <div className="space-y-6">
      <TooltipProvider>
      <form onSubmit={onSubmit} noValidate>
        <input type="hidden" {...form.register("avatarAssetId")} />

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold">Profile details</CardTitle>
                <CardDescription>Update your photo and how your profile appears across the workspace.</CardDescription>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => {
                      if (isProfileEditing) {
                        resetProfileDraft();
                        setIsProfileEditing(false);
                        return;
                      }
                      setIsProfileEditing(true);
                    }}
                  >
                    <PencilIcon className="h-4 w-4" />
                    <span className="sr-only">{isProfileEditing ? "Cancel editing" : "Edit profile"}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isProfileEditing ? "Cancel editing" : "Edit profile"}</TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <SettingsSectionGroup>
              <SettingsSectionCard
                icon={UserIconLucide}
                title="Profile"
                subtitle="Avatar and personal details."
              >
              <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
                <div className="space-y-4 rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <Avatar className="h-24 w-24 border-slate-300">
                      {previewUrl ? <AvatarImage src={previewUrl} alt={String(displayNameValue)} /> : null}
                      {!previewUrl ? <AvatarFallback className="text-xl">{initials(user)}</AvatarFallback> : null}
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{displayNameValue}</p>
                      <p className="text-xs text-slate-500">@{watchedUsername}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={onSelectFile}
                      disabled={profileInputsDisabled}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={profileInputsDisabled}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isUploading ? `Uploading... ${uploadProgress}%` : "Change photo"}
                    </Button>
                    <p className="text-xs text-slate-500">
                      JPEG, PNG, or WebP up to 2MB. {!isProfileEditing ? "Click edit to change." : ""}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <FormFieldText
                    id="profile-name"
                    name="name"
                    label="Name"
                    placeholder="Your full name (optional)"
                    register={form.register}
                    error={form.formState.errors.name}
                    disabled={profileInputsDisabled}
                  />

                  <FormFieldText
                    id="profile-username"
                    name="username"
                    label="Username"
                    placeholder="yourusername"
                    register={form.register}
                    error={form.formState.errors.username}
                    disabled={profileInputsDisabled}
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                  <p className="-mt-2 text-xs text-slate-500">
                    Used for sign in and mentions. Must be unique. Lowercase is recommended.
                  </p>

                  <FormFieldText
                    id="profile-display-name"
                    name="displayName"
                    label="Display name"
                    placeholder="Enter display name"
                    register={form.register}
                    error={form.formState.errors.displayName}
                    disabled={profileInputsDisabled}
                  />
                  <p className="-mt-2 text-xs text-slate-500">This is shown to others.</p>
                </div>
              </div>

              <FormErrorSummary
                serverError={serverError}
                errors={[
                  form.formState.errors.displayName?.message,
                  form.formState.errors.name?.message,
                  form.formState.errors.username?.message,
                  serverFieldErrors.name?.[0],
                  serverFieldErrors.username?.[0],
                  serverFieldErrors.displayName?.[0],
                  serverFieldErrors.avatarAssetId?.[0],
                ]}
              />

              <StickySaveBar
                dirty={form.formState.isDirty && isProfileEditing}
                pending={isSaving || isUploading}
                canSave={!isProfileEditing ? false : form.formState.isValid && !isSaving && !isUploading}
                onCancel={() => {
                  resetProfileDraft();
                  setIsProfileEditing(false);
                }}
              />
              </SettingsSectionCard>
            </SettingsSectionGroup>
          </CardContent>
        </Card>
      </form>
      </TooltipProvider>
    </div>
  );
}

export function ProfileSecurityForm() {
  const [passwordServerError, setPasswordServerError] = React.useState<string | null>(null);
  const [isChangingPassword, startPasswordTransition] = React.useTransition();
  const [showPasswords, setShowPasswords] = React.useState({
    current: false,
    next: false,
    confirm: false,
  });
  const passwordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
    mode: "onChange",
  });

  function PasswordInputRow({
    id,
    label,
    placeholder,
    autoComplete,
    fieldKey,
    error,
  }: {
    id: "profile-current-password" | "profile-new-password" | "profile-confirm-password";
    label: string;
    placeholder: string;
    autoComplete: string;
    fieldKey: keyof typeof showPasswords;
    error?: string;
  }) {
    const isVisible = showPasswords[fieldKey];
    const registration =
      fieldKey === "current"
        ? passwordForm.register("currentPassword")
        : fieldKey === "next"
          ? passwordForm.register("newPassword")
          : passwordForm.register("confirmNewPassword");

    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-sm text-slate-500">
          {label}
        </Label>
        <div className="relative">
          <Input
            id={id}
            {...registration}
            type={isVisible ? "text" : "password"}
            autoComplete={autoComplete}
            disabled={isChangingPassword}
            placeholder={placeholder}
            aria-invalid={error ? "true" : "false"}
            className={cn("pr-10", error ? "border-red-300 focus-visible:ring-red-300" : "")}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-8 w-8 text-slate-500"
            disabled={isChangingPassword}
            onClick={() => setShowPasswords((s) => ({ ...s, [fieldKey]: !s[fieldKey] }))}
            title={isVisible ? "Hide password" : "Show password"}
          >
            {isVisible ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            <span className="sr-only">{isVisible ? "Hide password" : "Show password"}</span>
          </Button>
        </div>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
    );
  }

  const onPasswordSubmit = passwordForm.handleSubmit((values) => {
    setPasswordServerError(null);
    startPasswordTransition(() => {
      void (async () => {
        const result = await changePasswordAction({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        });

        if (!result.ok) {
          setPasswordServerError(result.error);
          toast.error(result.error);
          return;
        }

        toast.success("Password updated.");
        passwordForm.reset({
          currentPassword: "",
          newPassword: "",
          confirmNewPassword: "",
        });
        setPasswordServerError(null);
      })();
    });
  });

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">Security</CardTitle>
        <CardDescription>Change your password and keep your account secure.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SettingsSectionGroup>
          <SettingsSectionCard icon={ShieldIcon} title="Password" subtitle="Update your password regularly.">
            <form onSubmit={onPasswordSubmit} className="mx-auto w-full max-w-xl space-y-3" noValidate>
            <PasswordInputRow
              id="profile-current-password"
              fieldKey="current"
              label="Current password"
              placeholder="Enter current password"
              autoComplete="current-password"
              error={passwordForm.formState.errors.currentPassword?.message}
            />

            <PasswordInputRow
              id="profile-new-password"
              fieldKey="next"
              label="New password"
              placeholder="Enter new password"
              autoComplete="new-password"
              error={passwordForm.formState.errors.newPassword?.message}
            />
            <p className="text-xs text-slate-500">
              At least 10 characters and include at least 1 letter and 1 number.
            </p>

            <PasswordInputRow
              id="profile-confirm-password"
              fieldKey="confirm"
              label="Confirm new password"
              placeholder="Re-enter new password"
              autoComplete="new-password"
              error={passwordForm.formState.errors.confirmNewPassword?.message}
            />

            <FormErrorSummary
              serverError={passwordServerError}
              errors={[
                passwordForm.formState.errors.currentPassword?.message,
                passwordForm.formState.errors.newPassword?.message,
                passwordForm.formState.errors.confirmNewPassword?.message,
              ]}
            />

              <StickySaveBar
                dirty={passwordForm.formState.isDirty}
                pending={isChangingPassword}
                canSave={passwordForm.formState.isValid && !isChangingPassword}
              />
            </form>
          </SettingsSectionCard>
        </SettingsSectionGroup>
      </CardContent>
    </Card>
  );
}
