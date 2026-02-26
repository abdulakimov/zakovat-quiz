"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SettingsSectionCard } from "@/src/components/layout/SettingsSectionCard";
import { createQuestionAction, updateQuestionAction } from "@/src/actions/questions";
import { FormErrorSummary } from "@/src/components/form/FormErrorSummary";
import { MediaPickerSheet, type MediaPickerAsset } from "@/src/components/media/MediaPickerSheet";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { toast } from "@/src/components/ui/sonner";
import { answerTypeSchema, createQuestionSchema, questionTypeSchema, updateQuestionSchema } from "@/src/schemas/questions";
import { cn } from "@/lib/utils";
import { AlertTriangleIcon, CheckCircle2Icon, ClockIcon, FilmIcon, ImageIcon, ListChecksIcon, MusicIcon, PlayIcon, SettingsIcon } from "@/src/ui/icons";
const OPTION_LABELS = ["A", "B", "C", "D"] as const;

function scrollToField(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  if ("focus" in el && typeof (el as { focus?: () => void }).focus === "function") {
    (el as { focus: () => void }).focus();
  }
}

function inferMediaKind(asset?: MediaAsset | null): MediaType | null {
  if (!asset) return null;
  if (asset.type) return asset.type;
  const mime = asset.mimeType?.toLowerCase() ?? "";
  if (mime.startsWith("image/")) return "IMAGE";
  if (mime.startsWith("video/")) return "VIDEO";
  if (mime.startsWith("audio/")) return "AUDIO";
  const name = `${asset.originalName} ${asset.path}`.toLowerCase();
  if (/\.(png|jpg|jpeg|webp|gif|avif|svg)\b/.test(name)) return "IMAGE";
  if (/\.(mp4|webm|mov|m4v)\b/.test(name)) return "VIDEO";
  if (/\.(mp3|wav|ogg|m4a|aac)\b/.test(name)) return "AUDIO";
  return null;
}

function CompactMediaCheck({
  asset,
  label,
  missing,
  onOpenField,
}: {
  asset?: MediaAsset | null;
  label: string;
  missing?: boolean;
  onOpenField: () => void;
}) {
  const [audioEl, setAudioEl] = React.useState<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const kind = inferMediaKind(asset);
  const url = asset ? asset.url ?? `/api/media/${asset.path}` : null;

  React.useEffect(() => {
    if (!audioEl) return;
    const onEnded = () => setPlaying(false);
    const onPause = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    audioEl.addEventListener("ended", onEnded);
    audioEl.addEventListener("pause", onPause);
    audioEl.addEventListener("play", onPlay);
    return () => {
      audioEl.removeEventListener("ended", onEnded);
      audioEl.removeEventListener("pause", onPause);
      audioEl.removeEventListener("play", onPlay);
    };
  }, [audioEl]);

  if (missing) {
    return (
      <button
        type="button"
        onClick={onOpenField}
        className="mt-2 flex w-full items-center gap-2 rounded-md border border-dashed border-amber-200 bg-amber-50 px-2 py-2 text-left"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded border border-amber-200 bg-white text-amber-700">
          <AlertTriangleIcon className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-amber-800">Missing</p>
          <p className="truncate text-xs text-amber-700">{label}</p>
        </div>
      </button>
    );
  }

  if (!asset || !url) return null;

  if (kind === "IMAGE") {
    return (
      <button type="button" onClick={onOpenField} className="mt-2 flex w-full items-center gap-2 rounded-md border border-slate-200 bg-white p-2 text-left hover:border-slate-300">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={`${label} preview`} className="h-16 w-16 rounded border border-slate-200 object-cover" />
        <div className="min-w-0">
          <p className="text-xs text-slate-500">Image</p>
          <p className="truncate text-xs text-slate-800">{asset.originalName}</p>
        </div>
      </button>
    );
  }

  if (kind === "VIDEO") {
    return (
      <button type="button" onClick={onOpenField} className="mt-2 flex w-full items-center gap-2 rounded-md border border-slate-200 bg-white p-2 text-left hover:border-slate-300">
        <div className="flex h-16 w-16 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-500">
          <FilmIcon className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-500">Video</p>
          <p className="truncate text-xs text-slate-800">{asset.originalName}</p>
        </div>
      </button>
    );
  }

  if (kind === "AUDIO") {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-md border border-slate-200 bg-white p-2">
        <button
          type="button"
          onClick={() => onOpenField()}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-500">
            <MusicIcon className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-xs text-slate-500">Audio</span>
            <span className="block truncate text-xs text-slate-800">{asset.originalName}</span>
          </span>
        </button>
        <button
          type="button"
          aria-label={playing ? `Pause ${label} audio preview` : `Play ${label} audio preview`}
          onClick={async () => {
            if (!audioEl) return;
            if (playing) {
              audioEl.pause();
              return;
            }
            try {
              audioEl.currentTime = 0;
              await audioEl.play();
            } catch {}
          }}
          className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          <PlayIcon className="h-3.5 w-3.5" aria-hidden />
        </button>
        <audio ref={setAudioEl} src={url} preload="none" className="hidden" />
      </div>
    );
  }

  return (
    <button type="button" onClick={onOpenField} className="mt-2 flex w-full items-center gap-2 rounded-md border border-slate-200 bg-white p-2 text-left hover:border-slate-300">
      <div className="flex h-16 w-16 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-500">
        <ImageIcon className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">Media</p>
        <p className="truncate text-xs text-slate-800">{asset.originalName}</p>
      </div>
    </button>
  );
}

type QuestionType = "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "OPTIONS";
type AnswerType = "TEXT" | "IMAGE" | "AUDIO" | "VIDEO";
type MediaType = "IMAGE" | "VIDEO" | "AUDIO";

type MediaAsset = {
  id: string;
  type: MediaType;
  path: string;
  originalName: string;
  url?: string;
  sizeBytes?: number | null;
  mimeType?: string | null;
};

type QuestionItem = {
  id: string;
  order: number;
  type: QuestionType;
  answerType: AnswerType;
  text: string;
  answer: string;
  answerText: string | null;
  explanation: string | null;
  timerSec: number | null;
  options: Array<{ id: string; order: number; text: string; isCorrect: boolean }>;
  media: Array<{
    id: string;
    role: "QUESTION_PRIMARY" | "QUESTION_EXTRA" | "ANSWER_PRIMARY" | "ANSWER_EXTRA";
    assetId: string;
    asset: MediaAsset;
  }>;
};

type RoundInfo = {
  id: string;
  order: number;
  title: string;
  description: string | null;
  defaultTimerSec: number;
  defaultQuestionType: QuestionType;
};

type QuestionFormValues = {
  roundId: string;
  questionId?: string;
  type: QuestionType;
  answerType: AnswerType;
  text: string;
  answerText: string;
  explanation: string;
  primaryMediaAssetId: string;
  answerPrimaryMediaAssetId: string;
  options: { order: number; text: string; isCorrect: boolean }[];
};

function createDefaultOptions() {
  return [1, 2, 3, 4].map((order) => ({ order, text: "", isCorrect: order === 1 }));
}

function mapQuestionToForm(
  roundId: string,
  defaultQuestionType: QuestionType,
  question?: QuestionItem | null,
): QuestionFormValues {
  const options = createDefaultOptions();
  if (question?.options?.length) {
    for (const opt of question.options) {
      const idx = options.findIndex((o) => o.order === opt.order);
      if (idx >= 0) options[idx] = { order: opt.order, text: opt.text, isCorrect: opt.isCorrect };
    }
  }
  return {
    roundId,
    questionId: question?.id,
    type: question?.type ?? defaultQuestionType,
    answerType: question?.answerType ?? "TEXT",
    text: question?.text ?? "",
    answerText: question?.answerText ?? (question?.answer ?? ""),
    explanation: question?.explanation ?? "",
    primaryMediaAssetId: question?.media.find((m) => m.role === "QUESTION_PRIMARY")?.assetId ?? "",
    answerPrimaryMediaAssetId: question?.media.find((m) => m.role === "ANSWER_PRIMARY")?.assetId ?? "",
    options,
  };
}

function assetToPicker(asset: MediaAsset): MediaPickerAsset {
  return {
    id: asset.id,
    type: asset.type,
    url: asset.url ?? `/api/media/${asset.path}`,
    name: asset.originalName,
    path: asset.path,
    sizeBytes: asset.sizeBytes ?? null,
    mimeType: asset.mimeType ?? null,
  };
}

function mergeAssets(seed: MediaAsset[], question?: QuestionItem | null) {
  const map = new Map<string, MediaAsset>();
  for (const item of seed) {
    map.set(item.id, item);
  }
  if (question?.media?.length) {
    for (const media of question.media) {
      if (!map.has(media.asset.id)) {
        map.set(media.asset.id, {
          ...media.asset,
          url: `/api/media/${media.asset.path}`,
        });
      }
    }
  }
  return Array.from(map.values());
}

export function QuestionEditor({
  mode,
  packId,
  packTitle,
  packDefaultQuestionTimerPresetSec,
  round,
  question,
  mediaAssets,
  backHref,
}: {
  mode: "create" | "edit";
  packId: string;
  packTitle: string;
  packDefaultQuestionTimerPresetSec: number | null;
  round: RoundInfo;
  question?: QuestionItem | null;
  mediaAssets: MediaAsset[];
  backHref: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [assets, setAssets] = React.useState<MediaAsset[]>(() => mergeAssets(mediaAssets, question));
  const schema = mode === "create" ? createQuestionSchema : updateQuestionSchema;

  const initialValues = React.useMemo(
    () => mapQuestionToForm(round.id, round.defaultQuestionType, question),
    [round.id, round.defaultQuestionType, question],
  );

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(schema as typeof createQuestionSchema),
    defaultValues: initialValues,
    mode: "onChange",
  });

  React.useEffect(() => {
    form.reset(initialValues);
    setServerError(null);
    setAssets(mergeAssets(mediaAssets, question));
  }, [form, initialValues, mediaAssets, question]);

  const selectedType = useWatch({ control: form.control, name: "type" }) ?? round.defaultQuestionType;
  const selectedAnswerType = useWatch({ control: form.control, name: "answerType" }) ?? "TEXT";
  const primaryMediaAssetId = useWatch({ control: form.control, name: "primaryMediaAssetId" }) ?? "";
  const answerPrimaryMediaAssetId = useWatch({ control: form.control, name: "answerPrimaryMediaAssetId" }) ?? "";
  const options = useWatch({ control: form.control, name: "options" }) ?? [];
  const text = useWatch({ control: form.control, name: "text" }) ?? "";
  const answerText = useWatch({ control: form.control, name: "answerText" }) ?? "";
  const explanation = useWatch({ control: form.control, name: "explanation" }) ?? "";
  const upsertAsset = React.useCallback((asset: MediaAsset) => {
    setAssets((prev) => [asset, ...prev.filter((item) => item.id !== asset.id)]);
  }, []);

  const selectedQuestionAsset = assets.find((asset) => asset.id === primaryMediaAssetId) ?? null;
  const selectedAnswerAsset = assets.find((asset) => asset.id === answerPrimaryMediaAssetId) ?? null;
  const filledOptionsCount = options.filter((opt) => opt.text.trim().length > 0).length;
  const questionTextPresent = text.trim().length > 0;
  const questionMediaRequired = selectedType === "IMAGE" || selectedType === "AUDIO" || selectedType === "VIDEO";
  const answerMediaRequired = selectedAnswerType === "IMAGE" || selectedAnswerType === "AUDIO" || selectedAnswerType === "VIDEO";
  const answerTextPresent = answerText.trim().length > 0;
  const checks = [
    { key: "question-text", label: "Question text present", ok: questionTextPresent, focusId: "question-text" },
    { key: "question-media", label: "Question media attached", ok: !questionMediaRequired || Boolean(selectedQuestionAsset), focusId: "question-type", active: questionMediaRequired },
    { key: "options", label: "Options question has 4 options", ok: selectedType !== "OPTIONS" || filledOptionsCount === 4, focusId: "question-text", active: selectedType === "OPTIONS" },
    { key: "answer-text", label: "Answer text present", ok: answerTextPresent, focusId: "answer-text" },
    { key: "answer-media", label: "Answer media attached", ok: !answerMediaRequired || Boolean(selectedAnswerAsset), focusId: "answer-type", active: answerMediaRequired },
  ].filter((item) => item.active === undefined || item.active);
  const failedChecks = checks.filter((item) => !item.ok);

  const submit = form.handleSubmit((values) => {
    setServerError(null);
    startTransition(() => {
      void (async () => {
        const fd = new FormData();
        fd.set("packId", packId);
        fd.set("roundId", round.id);
        if (values.questionId) fd.set("questionId", values.questionId);
        fd.set("type", values.type);
        fd.set("answerType", values.answerType);
        fd.set("text", values.text);
        fd.set("answerText", values.answerText ?? "");
        fd.set("explanation", values.explanation ?? "");
        fd.set("primaryMediaAssetId", values.primaryMediaAssetId ?? "");
        fd.set("answerPrimaryMediaAssetId", values.answerPrimaryMediaAssetId ?? "");
        fd.set("options", JSON.stringify(values.options));

        const result = mode === "create" ? await createQuestionAction({}, fd) : await updateQuestionAction({}, fd);
        if (result?.error) {
          setServerError(result.error);
          toast.error(result.error);
          return;
        }
        toast.success(result?.success ?? (mode === "create" ? "Question created." : "Question updated."));
        router.push(backHref);
        router.refresh();
      })();
    });
  }, () => {
    const firstError = Object.values(form.formState.errors)
      .flatMap((value) => {
        if (!value) return [];
        if (typeof value === "object" && "message" in value && typeof value.message === "string") {
          return [value.message];
        }
        if (typeof value === "object" && !("message" in value)) {
          return Object.values(value as Record<string, unknown>)
            .map((v) =>
              typeof v === "object" && v !== null && "message" in v && typeof (v as { message?: unknown }).message === "string"
                ? (v as { message: string }).message
                : null,
            )
            .filter((v): v is string => Boolean(v));
        }
        return [];
      })
      .find(Boolean);
    const message = firstError ?? "Please fix the highlighted fields.";
    setServerError(message);
    toast.error(message);
  });

  const canSave = form.formState.isDirty && form.formState.isValid && !isPending;
  const isEdit = mode === "edit";
  const showOptions = selectedType === "OPTIONS";
  const showQuestionMedia = selectedType === "IMAGE" || selectedType === "VIDEO" || selectedType === "AUDIO";
  const showAnswerMedia = selectedAnswerType === "IMAGE" || selectedAnswerType === "VIDEO" || selectedAnswerType === "AUDIO";
  const confirmIfDirty = React.useCallback(() => {
    if (!form.formState.isDirty) return true;
    return window.confirm("You have unsaved changes. Leave without saving?");
  }, [form.formState.isDirty]);

  React.useEffect(() => {
    if (!form.formState.isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const onPopState = () => {
      if (!confirmIfDirty()) {
        window.history.pushState(null, "", window.location.href);
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState);
    };
  }, [confirmIfDirty, form.formState.isDirty]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-10 pt-6">
        <PageHeader
          title={isEdit ? "Edit question" : "New question"}
          description={`${packTitle} - Round ${round.order}: ${round.title}`}
          backHref={backHref}
          onBack={confirmIfDirty}
          variant="compact"
          sticky
          breadcrumbs={[
            { label: "App", href: "/app" },
            { label: "Packs", href: "/app/packs" },
            { label: packTitle, href: `/app/packs/${packId}` },
            { label: round.title, href: `/app/packs/${packId}/rounds/${round.id}` },
            { label: isEdit ? "Edit question" : "New question" },
          ]}
          actions={
            <div className="flex items-center gap-2">
              {isEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={!form.formState.isDirty || isPending}
                  onClick={() => {
                    form.reset(initialValues);
                    setServerError(null);
                  }}
                >
                  Reset
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  if (!confirmIfDirty()) return;
                  router.push(backHref);
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" form="question-editor-form" disabled={!canSave}>
                {isPending ? (isEdit ? "Saving..." : "Creating...") : "Save"}
              </Button>
            </div>
          }
        />

        <div className="pt-4">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-8 xl:col-span-7">
              <form id="question-editor-form" onSubmit={submit} className="space-y-3" noValidate>
              <input type="hidden" {...form.register("roundId")} />
              <input type="hidden" {...form.register("type")} />
              <input type="hidden" {...form.register("answerType")} />
              <input type="hidden" {...form.register("primaryMediaAssetId")} />
              <input type="hidden" {...form.register("answerPrimaryMediaAssetId")} />
              {isEdit ? <input type="hidden" {...form.register("questionId")} /> : null}

              <div className="space-y-3">
                <SettingsSectionCard icon={SettingsIcon} title="Basics">
                  <div className="space-y-1.5">
                      <Label htmlFor="question-type" className="text-sm text-slate-500">Question type</Label>
                      <select
                        id="question-type"
                        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                        disabled={isPending}
                        value={selectedType}
                        onChange={(e) =>
                          form.setValue("type", questionTypeSchema.parse(e.target.value), { shouldDirty: true, shouldValidate: true })
                        }
                      >
                        {questionTypeSchema.options.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                  </div>
                </SettingsSectionCard>

                <SettingsSectionCard icon={ListChecksIcon} title="Question">
                  <div className="space-y-1.5">
                    <Label htmlFor="question-text" className="text-sm text-slate-500">Question text</Label>
                    <Textarea id="question-text" rows={4} {...form.register("text")} disabled={isPending} />
                    {form.formState.errors.text ? (
                      <p className="text-xs text-red-600">{form.formState.errors.text.message}</p>
                    ) : null}
                  </div>
                  {showQuestionMedia ? (
                    <div id="question-media-field" className="space-y-2">
                      <p className="text-xs font-medium text-slate-600">Question media</p>
                      <MediaPickerSheet
                        title="Question media"
                        allowed={selectedType}
                        disabled={isPending}
                        description=""
                        value={selectedQuestionAsset ? assetToPicker(selectedQuestionAsset) : null}
                        onChange={(asset) => {
                          form.setValue("primaryMediaAssetId", asset?.id ?? "", { shouldDirty: true, shouldValidate: true });
                          if (asset) {
                            upsertAsset({
                              id: asset.id,
                              type: asset.type,
                              path: asset.path ?? "",
                              originalName: asset.name,
                              url: asset.url,
                              sizeBytes: asset.sizeBytes ?? null,
                              mimeType: asset.mimeType ?? null,
                            });
                          }
                        }}
                      />
                      {form.formState.errors.primaryMediaAssetId ? (
                        <p className="text-xs text-red-600">{form.formState.errors.primaryMediaAssetId.message as string}</p>
                      ) : null}
                    </div>
                  ) : null}
                </SettingsSectionCard>

                {showOptions ? (
                  <SettingsSectionCard icon={ListChecksIcon} title="Options">
                    <div className="space-y-2">
                      {options.map((option, index) => (
                        <div key={option.order} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="correct-option"
                            checked={Boolean(option.isCorrect)}
                            onChange={() => {
                              const next = form.getValues("options").map((item, i) => ({ ...item, isCorrect: i === index }));
                              form.setValue("options", next, { shouldDirty: true, shouldValidate: true });
                            }}
                            disabled={isPending}
                          />
                          <Input
                            placeholder={`Option ${OPTION_LABELS[index]}`}
                            value={option.text}
                            onChange={(e) => {
                              const next = [...form.getValues("options")];
                              next[index] = { ...next[index], text: e.target.value };
                              form.setValue("options", next, { shouldDirty: true, shouldValidate: true });
                            }}
                            disabled={isPending}
                          />
                        </div>
                      ))}
                    </div>
                    {form.formState.errors.options ? (
                      <p className="text-xs text-red-600">{String(form.formState.errors.options.message ?? "Invalid options.")}</p>
                    ) : null}
                  </SettingsSectionCard>
                ) : null}

                <SettingsSectionCard icon={CheckCircle2Icon} title="Answer">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="answer-type" className="text-sm text-slate-500">Answer type</Label>
                      <select
                        id="answer-type"
                        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                        disabled={isPending}
                        value={selectedAnswerType}
                        onChange={(e) =>
                          form.setValue("answerType", answerTypeSchema.parse(e.target.value), { shouldDirty: true, shouldValidate: true })
                        }
                      >
                        {answerTypeSchema.options.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="answer-text" className="text-sm text-slate-500">
                        Answer
                      </Label>
                      <Input id="answer-text" {...form.register("answerText")} disabled={isPending} />
                      {form.formState.errors.answerText ? (
                        <p className="text-xs text-red-600">{form.formState.errors.answerText.message as string}</p>
                      ) : null}
                    </div>
                  </div>
                  {showAnswerMedia ? (
                    <div id="answer-media-field" className="space-y-2">
                      <p className="text-xs font-medium text-slate-600">Answer media</p>
                      <MediaPickerSheet
                        title="Answer media"
                        allowed={selectedAnswerType}
                        disabled={isPending}
                        description=""
                        value={selectedAnswerAsset ? assetToPicker(selectedAnswerAsset) : null}
                        onChange={(asset) => {
                          form.setValue("answerPrimaryMediaAssetId", asset?.id ?? "", { shouldDirty: true, shouldValidate: true });
                          if (asset) {
                            upsertAsset({
                              id: asset.id,
                              type: asset.type,
                              path: asset.path ?? "",
                              originalName: asset.name,
                              url: asset.url,
                              sizeBytes: asset.sizeBytes ?? null,
                              mimeType: asset.mimeType ?? null,
                            });
                          }
                        }}
                      />
                      {form.formState.errors.answerPrimaryMediaAssetId ? (
                        <p className="text-xs text-red-600">
                          {form.formState.errors.answerPrimaryMediaAssetId.message as string}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                </SettingsSectionCard>

                <SettingsSectionCard icon={ClockIcon} title="Explanation">
                  <Label htmlFor="question-explanation" className="text-sm text-slate-500">Explanation</Label>
                  <Textarea id="question-explanation" rows={3} {...form.register("explanation")} disabled={isPending} />
                  {form.formState.errors.explanation ? (
                    <p className="text-xs text-red-600">{form.formState.errors.explanation.message as string}</p>
                  ) : null}
                </SettingsSectionCard>
              </div>

              <FormErrorSummary
                serverError={serverError}
                errors={[
                  form.formState.errors.text?.message,
                  form.formState.errors.answerText?.message as string | undefined,
                  form.formState.errors.explanation?.message as string | undefined,
                  form.formState.errors.type?.message,
                  form.formState.errors.answerType?.message,
                  form.formState.errors.primaryMediaAssetId?.message as string | undefined,
                  form.formState.errors.answerPrimaryMediaAssetId?.message as string | undefined,
                  form.formState.errors.options?.message as string | undefined,
                ]}
              />
            </form>
          </div>

            <aside className="col-span-12 lg:col-span-4 xl:col-span-5 lg:sticky lg:top-20 lg:self-start">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">Checks</p>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-xs",
                      failedChecks.length === 0 ? "border-emerald-200 text-emerald-700" : "border-amber-200 text-amber-700",
                    )}
                  >
                    {failedChecks.length === 0 ? "Ready" : "Needs attention"}
                  </span>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="rounded-md border border-slate-200 p-2">
                    <p className="text-xs text-slate-500">Question</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-700">{selectedType}</span>
                      <span className={cn("rounded-full border px-2 py-0.5 text-xs", showQuestionMedia ? (selectedQuestionAsset ? "border-emerald-200 text-emerald-700" : "border-amber-200 text-amber-700") : "border-slate-200 text-slate-600")}>
                        {showQuestionMedia ? (selectedQuestionAsset ? "Media attached" : "Media missing") : "No media"}
                      </span>
                      {showOptions ? (
                        <span className={cn("rounded-full border px-2 py-0.5 text-xs", options.filter((o) => o.text.trim().length > 0).length === 4 ? "border-emerald-200 text-emerald-700" : "border-amber-200 text-amber-700")}>
                          {options.filter((o) => o.text.trim().length > 0).length}/4 options
                        </span>
                      ) : null}
                    </div>
                    {questionMediaRequired ? (
                      <CompactMediaCheck
                        asset={selectedQuestionAsset}
                        label="Question media"
                        missing={!selectedQuestionAsset}
                        onOpenField={() => scrollToField("question-media-field")}
                      />
                    ) : null}
                  </div>

                  <div className="rounded-md border border-slate-200 p-2">
                    <p className="text-xs text-slate-500">Answer</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={cn("rounded-full border px-2 py-0.5 text-xs", answerText.trim().length > 0 ? "border-emerald-200 text-emerald-700" : "border-amber-200 text-amber-700")}>
                        {answerText.trim().length > 0 ? "Text ok" : "Text missing"}
                      </span>
                      <span className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-700">{selectedAnswerType}</span>
                      {showAnswerMedia ? (
                        <span className={cn("rounded-full border px-2 py-0.5 text-xs", selectedAnswerAsset ? "border-emerald-200 text-emerald-700" : "border-amber-200 text-amber-700")}>
                          {selectedAnswerAsset ? "Media attached" : "Media missing"}
                        </span>
                      ) : null}
                    </div>
                    {answerMediaRequired ? (
                      <CompactMediaCheck
                        asset={selectedAnswerAsset}
                        label="Answer media"
                        missing={!selectedAnswerAsset}
                        onOpenField={() => scrollToField("answer-media-field")}
                      />
                    ) : null}
                  </div>

                  <div className="rounded-md border border-slate-200 p-2">
                    <p className="text-xs text-slate-500">Timer</p>
                    <p className="mt-2 text-sm text-slate-800">
                      {packDefaultQuestionTimerPresetSec != null ? `Pack preset: ${packDefaultQuestionTimerPresetSec}s` : `Round default: ${round.defaultTimerSec}s`}
                    </p>
                  </div>

                  <div className="rounded-md border border-slate-200 p-2">
                    <p className="text-xs text-slate-500">Checks</p>
                    <div className="mt-2 space-y-2">
                      {checks.map((check) => (
                        <div key={check.key} className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            {check.ok ? (
                              <CheckCircle2Icon className="mt-0.5 h-3.5 w-3.5 text-emerald-600" aria-hidden />
                            ) : (
                              <AlertTriangleIcon className="mt-0.5 h-3.5 w-3.5 text-amber-600" aria-hidden />
                            )}
                            <span className={cn("text-xs", check.ok ? "text-slate-700" : "text-amber-800")}>{check.label}</span>
                          </div>
                          {!check.ok ? (
                            <button
                              type="button"
                              onClick={() => scrollToField(check.focusId)}
                              className="shrink-0 text-xs text-slate-600 underline underline-offset-2 hover:text-slate-900"
                            >
                              Fix
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-md border border-slate-200 p-2">
                    <p className="text-xs text-slate-500">Warnings</p>
                    <div className="mt-2 space-y-2">
                      {(selectedType === "AUDIO" || selectedType === "VIDEO") && !selectedQuestionAsset ? (
                        <button type="button" onClick={() => scrollToField("question-type")} className="block text-left text-xs text-amber-700 hover:underline">
                          {selectedType} question needs a clip
                        </button>
                      ) : null}
                      {showOptions && options.filter((o) => o.text.trim().length > 0).length < 4 ? (
                        <button type="button" onClick={() => scrollToField("question-text")} className="block text-left text-xs text-amber-700 hover:underline">
                          Options question needs 4 options
                        </button>
                      ) : null}
                      {answerText.trim().length < 1 ? (
                        <button type="button" onClick={() => scrollToField("answer-text")} className="block text-left text-xs text-amber-700 hover:underline">
                          Answer is required
                        </button>
                      ) : null}
                      {showAnswerMedia && !selectedAnswerAsset ? (
                        <button type="button" onClick={() => scrollToField("answer-type")} className="block text-left text-xs text-amber-700 hover:underline">
                          Answer media is required for {selectedAnswerType.toLowerCase()}
                        </button>
                      ) : null}
                      {!((selectedType === "AUDIO" || selectedType === "VIDEO") && !selectedQuestionAsset) &&
                      !(showOptions && options.filter((o) => o.text.trim().length > 0).length < 4) &&
                      !(answerText.trim().length < 1) &&
                      !(showAnswerMedia && !selectedAnswerAsset) ? (
                        <p className="text-xs text-slate-500">No warnings</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
