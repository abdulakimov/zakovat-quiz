"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, type UseFormRegister } from "react-hook-form";
import type { z } from "zod";
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
import { UserAvatar } from "@/src/components/layout/UserAvatar";
import { toast } from "@/src/components/ui/sonner";
import { EyeIcon, EyeOffIcon, PencilIcon, UserIconLucide, ShieldIcon } from "@/src/ui/icons";
import { zodResolverCompat } from "@/src/validators/rhf-zod";
import {
  changePasswordSchema,
  setPasswordSchema,
  updateProfileSchema,
  type ChangePasswordInput,
  type SetPasswordInput,
  type UpdateProfileInput,
} from "@/src/schemas/profile";

type Props = {
  user: {
    id: string;
    username: string;
    name: string | null;
    email?: string | null;
    displayName?: string | null;
    imageUrl?: string | null;
    avatarSource?: "PROVIDER" | "CUSTOM";
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

function getResolvedAvatarUrl(user: Props["user"]) {
  const customAvatar = user.avatarAsset?.path ? `/api/media/${user.avatarAsset.path}` : null;
  if (user.avatarSource === "CUSTOM") {
    return customAvatar;
  }
  return user.imageUrl ?? customAvatar;
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
  const tProfile = useTranslations("profile");
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isSaving, startTransition] = React.useTransition();
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(getResolvedAvatarUrl(user));
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = React.useState<Record<string, string[] | undefined>>({});
  const [isProfileEditing, setIsProfileEditing] = React.useState(false);

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolverCompat(updateProfileSchema as z.ZodType<UpdateProfileInput>),
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
      toast.success(tProfile("photoUploaded"));
    } catch (error) {
      setPreviewUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return getResolvedAvatarUrl(user);
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

        toast.success(tProfile("profileUpdated"));
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
    setPreviewUrl(getResolvedAvatarUrl(user));
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
                <CardTitle className="text-base font-semibold">{tProfile("detailsTitle")}</CardTitle>
                <CardDescription>{tProfile("detailsDescription")}</CardDescription>
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
                    <span className="sr-only">{isProfileEditing ? tProfile("cancelEditing") : tProfile("editProfile")}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isProfileEditing ? tProfile("cancelEditing") : tProfile("editProfile")}</TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <SettingsSectionGroup>
              <SettingsSectionCard
                icon={UserIconLucide}
                title={tProfile("profileSectionTitle")}
                subtitle={tProfile("profileSectionSubtitle")}
              >
              <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
                <div className="space-y-4 rounded-lg border border-border p-4">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <UserAvatar
                      imageUrl={previewUrl}
                      alt={String(displayNameValue)}
                      fallback={initials(user)}
                      className="h-24 w-24 border-border"
                      fallbackClassName="text-xl"
                      sizes="96px"
                      imageTestId="profile-avatar-image"
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{displayNameValue}</p>
                      <p className="text-xs text-muted-foreground">@{watchedUsername}</p>
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
                      {isUploading ? `Uploading... ${uploadProgress}%` : tProfile("changePhoto")}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      {tProfile("photoHint")} {!isProfileEditing ? tProfile("photoHintEdit") : ""}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <FormFieldText
                    id="profile-name"
                    name="name"
                    label={tProfile("nameLabel")}
                    placeholder={tProfile("namePlaceholder")}
                    register={form.register}
                    error={form.formState.errors.name}
                    disabled={profileInputsDisabled}
                  />

                  <FormFieldText
                    id="profile-username"
                    name="username"
                    label={tProfile("usernameLabel")}
                    placeholder={tProfile("usernamePlaceholder")}
                    register={form.register}
                    error={form.formState.errors.username}
                    disabled={profileInputsDisabled}
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                  <p className="-mt-2 text-xs text-muted-foreground">
                    {tProfile("usernameHint")}
                  </p>

                  <FormFieldText
                    id="profile-display-name"
                    name="displayName"
                    label={tProfile("displayNameLabel")}
                    placeholder={tProfile("displayNamePlaceholder")}
                    register={form.register}
                    error={form.formState.errors.displayName}
                    disabled={profileInputsDisabled}
                  />
                  <p className="-mt-2 text-xs text-muted-foreground">{tProfile("displayNameHint")}</p>
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

type PasswordFormValues = ChangePasswordInput & SetPasswordInput;

type PasswordInputRowProps = {
  id: "profile-current-password" | "profile-new-password" | "profile-confirm-password";
  name: "currentPassword" | "newPassword" | "confirmNewPassword";
  label: string;
  placeholder: string;
  autoComplete: string;
  isVisible: boolean;
  isDisabled: boolean;
  error?: string;
  toggleLabel: string;
  onToggleVisibility: () => void;
  register: UseFormRegister<PasswordFormValues>;
};

function PasswordInputRow({
  id,
  name,
  label,
  placeholder,
  autoComplete,
  isVisible,
  isDisabled,
  error,
  toggleLabel,
  onToggleVisibility,
  register,
}: PasswordInputRowProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          {...register(name)}
          type={isVisible ? "text" : "password"}
          autoComplete={autoComplete}
          disabled={isDisabled}
          placeholder={placeholder}
          aria-invalid={error ? "true" : "false"}
          className={cn("pr-10", error ? "border-destructive focus-visible:ring-destructive" : "")}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1 h-8 w-8 text-muted-foreground"
          disabled={isDisabled}
          onClick={onToggleVisibility}
          title={toggleLabel}
        >
          {isVisible ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          <span className="sr-only">{toggleLabel}</span>
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

type ProfileSecurityFormProps = {
  hasPassword: boolean;
  providerNames?: string[];
};

export function ProfileSecurityForm({ hasPassword, providerNames = [] }: ProfileSecurityFormProps) {
  const tSecurity = useTranslations("security");
  const [passwordServerError, setPasswordServerError] = React.useState<string | null>(null);
  const [isChangingPassword, startPasswordTransition] = React.useTransition();
  const passwordSchema = React.useMemo(
    () => (hasPassword ? changePasswordSchema : setPasswordSchema),
    [hasPassword],
  );
  const [showPasswords, setShowPasswords] = React.useState({
    current: false,
    next: false,
    confirm: false,
  });
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolverCompat(passwordSchema as unknown as z.ZodType<PasswordFormValues>),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const newPasswordValue = passwordForm.watch("newPassword") ?? "";
  const confirmPasswordValue = passwordForm.watch("confirmNewPassword") ?? "";
  const currentPasswordValue = passwordForm.watch("currentPassword") ?? "";
  const passwordHasMinLength = newPasswordValue.length >= 10;
  const passwordHasLetter = /[A-Za-z]/.test(newPasswordValue);
  const passwordHasNumber = /\d/.test(newPasswordValue);
  const confirmMatches = confirmPasswordValue.length > 0 && confirmPasswordValue === newPasswordValue;
  const isSubmitting = isChangingPassword || passwordForm.formState.isSubmitting;
  const canSave = passwordForm.formState.isDirty && passwordForm.formState.isValid && !isSubmitting;

  const missingItems = React.useMemo(() => {
    const missing: string[] = [];

    if (hasPassword && currentPasswordValue.trim().length === 0) {
      missing.push(tSecurity("saveHintCurrentPassword"));
    }
    if (!passwordHasMinLength) {
      missing.push(tSecurity("saveHintMinLength"));
    }
    if (!passwordHasLetter) {
      missing.push(tSecurity("saveHintLetter"));
    }
    if (!passwordHasNumber) {
      missing.push(tSecurity("saveHintNumber"));
    }
    if (!confirmMatches) {
      missing.push(tSecurity("saveHintConfirmMatch"));
    }

    return missing;
  }, [
    confirmMatches,
    currentPasswordValue,
    hasPassword,
    passwordHasLetter,
    passwordHasMinLength,
    passwordHasNumber,
    tSecurity,
  ]);

  const disabledSaveHint =
    !canSave && missingItems.length > 0
      ? tSecurity("saveHint", { items: missingItems.join(", ") })
      : null;

  const linkedProviderLabels = React.useMemo(() => {
    const labels: string[] = [];
    if (providerNames.includes("google")) {
      labels.push(tSecurity("providerGoogle"));
    }
    if (providerNames.includes("telegram")) {
      labels.push(tSecurity("providerTelegram"));
    }
    if (labels.length === 0) {
      labels.push(tSecurity("providerGoogle"), tSecurity("providerTelegram"));
    }
    return labels.join(" / ");
  }, [providerNames, tSecurity]);

  const onPasswordSubmit = passwordForm.handleSubmit((values) => {
    setPasswordServerError(null);

    startPasswordTransition(() => {
      void (async () => {
        const result = await changePasswordAction({
          currentPassword: hasPassword ? values.currentPassword : undefined,
          newPassword: values.newPassword,
        });

        if (!result.ok) {
          setPasswordServerError(result.error);
          toast.error(result.error);
          return;
        }

        toast.success(tSecurity("passwordUpdated"));
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
        <CardTitle className="text-base font-semibold">{tSecurity("sectionTitle")}</CardTitle>
        <CardDescription>{tSecurity("sectionDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SettingsSectionGroup>
          <SettingsSectionCard icon={ShieldIcon} title={tSecurity("passwordTitle")} subtitle={tSecurity("passwordSubtitle")}>
            <form onSubmit={onPasswordSubmit} className="mx-auto w-full max-w-xl space-y-3" noValidate>
              {!hasPassword ? (
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                  {tSecurity("setPasswordDescription", { providers: linkedProviderLabels })}
                </div>
              ) : null}

              {hasPassword ? (
                <PasswordInputRow
                  id="profile-current-password"
                  name="currentPassword"
                  label={tSecurity("currentPasswordLabel")}
                  placeholder={tSecurity("currentPasswordPlaceholder")}
                  autoComplete="current-password"
                  isVisible={showPasswords.current}
                  isDisabled={isChangingPassword}
                  error={passwordForm.formState.errors.currentPassword?.message}
                  toggleLabel={showPasswords.current ? tSecurity("hidePassword") : tSecurity("showPassword")}
                  onToggleVisibility={() => setShowPasswords((s) => ({ ...s, current: !s.current }))}
                  register={passwordForm.register}
                />
              ) : null}

              <PasswordInputRow
                id="profile-new-password"
                name="newPassword"
                label={tSecurity("newPasswordLabel")}
                placeholder={tSecurity("newPasswordPlaceholder")}
                autoComplete="new-password"
                isVisible={showPasswords.next}
                isDisabled={isChangingPassword}
                error={passwordForm.formState.errors.newPassword?.message}
                toggleLabel={showPasswords.next ? tSecurity("hidePassword") : tSecurity("showPassword")}
                onToggleVisibility={() => setShowPasswords((s) => ({ ...s, next: !s.next }))}
                register={passwordForm.register}
              />
              <p className="text-xs text-muted-foreground">{tSecurity("passwordHint")}</p>
              <div className="space-y-1 text-xs" data-testid="password-checklist">
                <p className={cn(passwordHasMinLength ? "text-emerald-600" : "text-muted-foreground")}>
                  {passwordHasMinLength ? tSecurity("checkOkLength") : tSecurity("checkMissingLength")}
                </p>
                <p className={cn(passwordHasLetter ? "text-emerald-600" : "text-muted-foreground")}>
                  {passwordHasLetter ? tSecurity("checkOkLetter") : tSecurity("checkMissingLetter")}
                </p>
                <p className={cn(passwordHasNumber ? "text-emerald-600" : "text-muted-foreground")}>
                  {passwordHasNumber ? tSecurity("checkOkNumber") : tSecurity("checkMissingNumber")}
                </p>
                <p className={cn(confirmMatches ? "text-emerald-600" : "text-muted-foreground")}>
                  {confirmMatches ? tSecurity("checkOkMatch") : tSecurity("checkMissingMatch")}
                </p>
              </div>

              <PasswordInputRow
                id="profile-confirm-password"
                name="confirmNewPassword"
                label={tSecurity("confirmNewPasswordLabel")}
                placeholder={tSecurity("confirmNewPasswordPlaceholder")}
                autoComplete="new-password"
                isVisible={showPasswords.confirm}
                isDisabled={isChangingPassword}
                error={passwordForm.formState.errors.confirmNewPassword?.message}
                toggleLabel={showPasswords.confirm ? tSecurity("hidePassword") : tSecurity("showPassword")}
                onToggleVisibility={() => setShowPasswords((s) => ({ ...s, confirm: !s.confirm }))}
                register={passwordForm.register}
              />

              <FormErrorSummary
                serverError={passwordServerError}
                errors={[
                  hasPassword ? passwordForm.formState.errors.currentPassword?.message : undefined,
                  passwordForm.formState.errors.newPassword?.message,
                  passwordForm.formState.errors.confirmNewPassword?.message,
                ]}
              />

              {disabledSaveHint ? (
                <p className="text-xs text-muted-foreground" data-testid="security-save-hint">
                  {disabledSaveHint}
                </p>
              ) : null}

              <StickySaveBar
                dirty={passwordForm.formState.isDirty}
                pending={isSubmitting}
                canSave={canSave}
              />
            </form>
          </SettingsSectionCard>
        </SettingsSectionGroup>
      </CardContent>
    </Card>
  );
}
