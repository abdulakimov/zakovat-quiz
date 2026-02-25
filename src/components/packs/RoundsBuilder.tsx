"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionGroup } from "@/src/components/ui/action-group";
import { IconButton } from "@/src/components/ui/icon-button";
import { SettingsSectionCard } from "@/src/components/layout/SettingsSectionCard";
import { StickySaveBar } from "@/src/components/layout/StickySaveBar";
import {
  createRoundAction,
  deleteRoundAction,
  generateZakovatTemplateAction,
  reorderRoundsAction,
  updateRoundAction,
} from "@/src/actions/rounds";
import { FormErrorSummary } from "@/src/components/form/FormErrorSummary";
import { toast } from "@/src/components/ui/sonner";
import { createRoundSchema, questionTypeSchema, updateRoundSchema } from "@/src/schemas/rounds";
import { ListChecksIcon, MusicIcon, PencilIcon, PlusIcon, TrashIcon, ClockIcon, SlidersIcon } from "@/src/ui/icons";
import { cn } from "@/lib/utils";
import { getFeatureAccent } from "@/src/lib/featureAccent";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type QuestionType = "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "OPTIONS";

type RoundItem = {
  id: string;
  order: number;
  title: string;
  description: string | null;
  defaultQuestionType: QuestionType;
  defaultTimerSec: number;
  recapEnabled?: boolean;
  _count: { questions: number };
};

const QUESTION_TYPE_DEFAULT_TITLE: Record<QuestionType, string> = {
  TEXT: "Text round",
  IMAGE: "Image round",
  VIDEO: "Video round",
  AUDIO: "Audio round",
  OPTIONS: "Options round",
};

type RoundFormValues = {
  packId: string;
  roundId?: string;
  description: string;
  defaultQuestionType: QuestionType;
  title: string;
  defaultTimerSec: number;
};

function MetaPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600">
      {children}
    </span>
  );
}

function RoundRow({
  round,
  packId,
  showDirty,
  pendingAction,
  reorderMode,
  reducedMotion,
  index,
  onEdit,
  onDelete,
}: {
  round: RoundItem;
  packId: string;
  showDirty: boolean;
  pendingAction: string | null;
  reorderMode: boolean;
  reducedMotion: boolean | null;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const accent = getFeatureAccent("packs");
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: round.id,
    disabled: !reorderMode,
    animateLayoutChanges: (args) => args.isSorting || args.wasDragging,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    animationDelay: `${(index % 6) * 40}ms`,
  };

  return (
    <motion.div
      layout
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: reducedMotion ? 0 : 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reducedMotion ? 0 : -6 }}
      transition={{ duration: reducedMotion ? 0 : 0.18, ease: "easeOut" }}
      className={cn(isDragging && "opacity-70")}
    >
      <Card
        className={cn(
          "transition hover:border-slate-300",
          reorderMode && "border-dashed border-slate-300 reorder-wiggle cursor-grab active:cursor-grabbing",
          isDragging && "z-50 scale-[1.01] shadow-lg ring-2 ring-slate-200",
        )}
        {...(reorderMode ? { ...attributes, ...listeners } : {})}
      >
        <CardContent className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={`/app/packs/${packId}/rounds/${round.id}`}
            aria-label={`Open ${round.title}`}
            className={cn("absolute inset-0 z-0", reorderMode && "pointer-events-none")}
          />
          <div className="relative z-10 flex min-w-0 items-center gap-3">
            {reorderMode ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm">
                    <GripVerticalIcon className={cn("h-4 w-4", isDragging && "text-slate-900")} />
                  </span>
                </TooltipTrigger>
                <TooltipContent>Drag to reorder</TooltipContent>
              </Tooltip>
            ) : null}
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="flex items-center gap-2 truncate text-base font-semibold text-slate-900">
                  {round.order}. {round.title}
                  {showDirty ? <span className="h-2 w-2 rounded-full bg-amber-400" /> : null}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className={cn("border", accent.badge)}>{round.defaultQuestionType}</Badge>
                <MetaPill>{round.defaultTimerSec}s timer</MetaPill>
                {round.recapEnabled ? <MetaPill>Recap</MetaPill> : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>{round._count.questions} questions</span>
                <span className="inline-flex items-center gap-1">
                  <MusicIcon className="h-3.5 w-3.5" aria-hidden />
                  <span className="max-w-[220px] truncate">No music</span>
                </span>
              </div>
              {round.description ? <p className="text-xs text-slate-500">{round.description}</p> : null}
            </div>
          </div>

          <ActionGroup className="relative z-10">
            <IconButton
              label="Edit round"
              tooltip="Edit"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={onEdit}
            >
              <PencilIcon className="h-4 w-4" />
            </IconButton>
            <IconButton
              label="Delete round"
              tooltip="Delete"
              className={cn("text-red-600 hover:text-red-700", reorderMode && "opacity-40")}
              disabled={pendingAction !== null || reorderMode}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={onDelete}
            >
              <TrashIcon className="h-4 w-4" />
            </IconButton>
          </ActionGroup>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function RoundFormDialog({
  mode,
  open,
  onOpenChange,
  packId,
  initial,
  onDirtyChange,
}: {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (next: boolean) => void;
  packId: string;
  initial?: RoundItem | null;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [isPending, startTransition] = React.useTransition();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [resetOpen, setResetOpen] = React.useState(false);
  const schema = mode === "create" ? createRoundSchema : updateRoundSchema;
  const showSchemaError = !schema && process.env.NODE_ENV !== "production";
  const form = useForm<RoundFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      packId,
      roundId: initial?.id,
      title: initial?.title ?? "New round",
      description: initial?.description ?? "",
      defaultQuestionType: initial?.defaultQuestionType ?? "TEXT",
      defaultTimerSec: initial?.defaultTimerSec ?? 60,
    },
    mode: "onChange",
  });

  React.useEffect(() => {
    if (!open) return;
    form.reset({
      packId,
      roundId: initial?.id,
      title: initial?.title ?? "New round",
      description: initial?.description ?? "",
      defaultQuestionType: initial?.defaultQuestionType ?? "TEXT",
      defaultTimerSec: initial?.defaultTimerSec ?? 60,
    });
    setServerError(null);
  }, [open, initial, packId, form]);

  React.useEffect(() => {
    if (!open) {
      onDirtyChange?.(false);
      return;
    }
    onDirtyChange?.(form.formState.isDirty);
  }, [form.formState.isDirty, onDirtyChange, open]);

  const selectedType = useWatch({ control: form.control, name: "defaultQuestionType" }) ?? "TEXT";
  const onTypeChange = (nextType: QuestionType) => {
    const currentTitle = form.getValues("title").trim();
    const currentDefaultTitle = QUESTION_TYPE_DEFAULT_TITLE[selectedType];
    form.setValue("defaultQuestionType", nextType, { shouldDirty: true, shouldValidate: true });
    if (mode === "create" && (!currentTitle || currentTitle === currentDefaultTitle)) {
      form.setValue("title", QUESTION_TYPE_DEFAULT_TITLE[nextType], { shouldDirty: true, shouldValidate: true });
    }
  };

  const submit = form.handleSubmit((values) => {
    setServerError(null);
    startTransition(() => {
      void (async () => {
        const fd = new FormData();
        fd.set("packId", packId);
        if (values.roundId) fd.set("roundId", values.roundId);
        fd.set("title", values.title);
        fd.set("description", values.description ?? "");
        fd.set("defaultQuestionType", values.defaultQuestionType);
        fd.set("defaultTimerSec", String(values.defaultTimerSec));
        const result =
          mode === "create" ? await createRoundAction({}, fd) : await updateRoundAction({}, fd);
        if (result?.error) {
          setServerError(result.error);
          toast.error(result.error);
          return;
        }
        toast.success(result?.success ?? (mode === "create" ? "Round created." : "Round updated."));
        onOpenChange(false);
        router.refresh();
      })();
    });
  });
  const canSave = form.formState.isDirty && form.formState.isValid && !isPending;

  const applyResetDefaults = () => {
    const currentTitle = form.getValues("title");
    form.setValue("title", currentTitle, { shouldDirty: true, shouldValidate: true });
    form.setValue("description", "", { shouldDirty: true, shouldValidate: true });
    form.setValue("defaultTimerSec", 60, { shouldDirty: true, shouldValidate: true });
    form.setValue("defaultQuestionType", "TEXT", { shouldDirty: true, shouldValidate: true });
    toast.success("Reset applied.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add round" : "Edit round"}</DialogTitle>
          <DialogDescription>
            Configure round title, defaults, and timer.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[calc(100vh-220px)] overflow-auto pr-1">
          <form id={`round-form-${mode}`} onSubmit={submit} className="space-y-4" noValidate>
            <input type="hidden" {...form.register("packId")} />
            {mode === "edit" ? <input type="hidden" {...form.register("roundId")} /> : null}

            <div className="space-y-3">
              <SettingsSectionCard
                icon={SlidersIcon}
                title="Basics"
                subtitle="Round title and description."
              >
                <div className="space-y-2">
                  <Label htmlFor={`${mode}-round-title`} className="text-sm text-slate-500">Title</Label>
                  <Input
                    id={`${mode}-round-title`}
                    {...form.register("title")}
                    disabled={isPending}
                    aria-invalid={form.formState.errors.title ? "true" : "false"}
                    className="h-10"
                  />
                  {form.formState.errors.title ? <p className="text-xs text-red-600">{form.formState.errors.title.message}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${mode}-round-description`} className="text-sm text-slate-500">Description</Label>
                  <Input
                    id={`${mode}-round-description`}
                    {...form.register("description")}
                    disabled={isPending}
                    placeholder="Optional round description"
                    aria-invalid={form.formState.errors.description ? "true" : "false"}
                    className="h-10"
                  />
                  {form.formState.errors.description ? (
                    <p className="text-xs text-red-600">{form.formState.errors.description.message as string}</p>
                  ) : null}
                </div>
              </SettingsSectionCard>

              <SettingsSectionCard
                icon={ClockIcon}
                title="Defaults"
                subtitle="Default question type and timer."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`${mode}-round-type`} className="text-sm text-slate-500">Default question type</Label>
                    <select
                      id={`${mode}-round-type`}
                      value={selectedType}
                      onChange={(e) => onTypeChange(questionTypeSchema.parse(e.target.value))}
                      disabled={isPending}
                      className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900"
                    >
                      {questionTypeSchema.options.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${mode}-round-timer`} className="text-sm text-slate-500">Default timer (sec)</Label>
                    <Input
                      id={`${mode}-round-timer`}
                      type="number"
                      min={10}
                      max={300}
                      {...form.register("defaultTimerSec", { valueAsNumber: true })}
                      disabled={isPending}
                      className="h-10"
                    />
                    {form.formState.errors.defaultTimerSec ? (
                      <p className="text-xs text-red-600">{form.formState.errors.defaultTimerSec.message}</p>
                    ) : null}
                  </div>
                </div>
              </SettingsSectionCard>
            </div>

            <FormErrorSummary
              serverError={serverError}
              errors={[
                form.formState.errors.title?.message,
                form.formState.errors.description?.message as string | undefined,
                form.formState.errors.defaultTimerSec?.message,
                form.formState.errors.defaultQuestionType?.message,
              ]}
            />
            {showSchemaError ? (
              <p className="text-xs text-red-600">Form schema is missing. Check round form setup.</p>
            ) : null}

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => {
                  if (form.formState.isDirty) {
                    setResetOpen(true);
                    return;
                  }
                  applyResetDefaults();
                }}
              >
                Reset to defaults
              </Button>
            </div>
          </form>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" size="sm" form={`round-form-${mode}`} disabled={!canSave}>
            {isPending ? (mode === "create" ? "Creating..." : "Saving...") : mode === "create" ? "Create" : "Save"}
          </Button>
        </div>
      </DialogContent>
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to defaults?</AlertDialogTitle>
            <AlertDialogDescription>Reset will discard your changes.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                type="button"
                onClick={() => {
                  setResetOpen(false);
                  applyResetDefaults();
                }}
              >
                Reset
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

export function RoundsBuilder({
  packId,
  rounds,
}: {
  packId: string;
  rounds: RoundItem[];
}) {
  const router = useRouter();
  const [reorderMode, setReorderMode] = React.useState(false);
  const [orderedRounds, setOrderedRounds] = React.useState<RoundItem[]>(rounds);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editRound, setEditRound] = React.useState<RoundItem | null>(null);
  const [editDirty, setEditDirty] = React.useState(false);
  const [deleteRound, setDeleteRound] = React.useState<RoundItem | null>(null);
  const [generateConfirmOpen, setGenerateConfirmOpen] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();
  const reducedMotion = useReducedMotion();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  React.useEffect(() => {
    setOrderedRounds(rounds);
  }, [rounds]);

  const applyReorder = React.useCallback(
    (nextRounds: RoundItem[]) => {
      setOrderedRounds(nextRounds);
      setPendingAction("reorder");
      startTransition(() => {
        void (async () => {
          const fd = new FormData();
          fd.set("packId", packId);
          fd.set("orderedRoundIds", JSON.stringify(nextRounds.map((round) => round.id)));
          const result = await reorderRoundsAction({}, fd);
          if (result?.error) {
            toast.error(result.error);
            setOrderedRounds(rounds);
          } else {
            toast.success(result?.success ?? "Round order updated.");
            router.refresh();
          }
          setPendingAction(null);
        })();
      });
    },
    [packId, reorderRoundsAction, rounds, router, startTransition],
  );

  const confirmDelete = () => {
    if (!deleteRound) return;
    setPendingAction(`delete:${deleteRound.id}`);
    startTransition(() => {
      void (async () => {
        const fd = new FormData();
        fd.set("packId", packId);
        fd.set("roundId", deleteRound.id);
        const result = await deleteRoundAction(fd);
        if (result?.error) toast.error(result.error);
        if (result?.success) {
          toast.success(result.success);
          setDeleteRound(null);
          router.refresh();
        }
        setPendingAction(null);
      })();
    });
  };

  const runGenerateTemplate = () => {
    setPendingAction("generate-template");
    startTransition(() => {
      void (async () => {
        const fd = new FormData();
        fd.set("packId", packId);
        const result = await generateZakovatTemplateAction({}, fd);
        if (result?.error) {
          toast.error(result.error);
        } else {
          toast.success(result?.success ?? "Template generated.");
          setGenerateConfirmOpen(false);
          router.refresh();
        }
        setPendingAction(null);
      })();
    });
  };

  return (
    <TooltipProvider>
      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Rounds</h2>
            <span className="text-sm text-slate-500">{rounds.length} total</span>
            {reorderMode ? <span className="text-xs text-slate-500">Drag rounds to reorder</span> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pendingAction !== null || reorderMode}
              onClick={() => {
                if (rounds.length > 0) setGenerateConfirmOpen(true);
                else runGenerateTemplate();
              }}
            >
              {pendingAction === "generate-template" ? "Generating..." : "Generate Zakovat template (7 rounds)"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={reorderMode ? "default" : "outline"}
              onClick={() => setReorderMode((value) => !value)}
            >
              {reorderMode ? "Done" : "Reorder"}
            </Button>
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)} disabled={reorderMode}>
              <PlusIcon className="mr-2 h-4 w-4" aria-hidden />
              Add round
            </Button>
          </div>
        </div>

      {rounds.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <ListChecksIcon className="h-4 w-4" />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-900">No rounds yet</p>
            <p className="mt-1 text-sm text-slate-600">Add your first round to start building the pack.</p>
            <Button type="button" className="mt-4" onClick={() => setCreateOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" aria-hidden />
              Add round
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={reorderMode ? sensors : undefined}
          collisionDetection={closestCenter}
          onDragStart={(event) => setActiveId(String(event.active.id))}
          onDragEnd={(event) => {
            const { active, over } = event;
            setActiveId(null);
            if (!over || active.id === over.id) return;
            const oldIndex = orderedRounds.findIndex((round) => round.id === active.id);
            const newIndex = orderedRounds.findIndex((round) => round.id === over.id);
            if (oldIndex < 0 || newIndex < 0) return;
            const nextRounds = arrayMove(orderedRounds, oldIndex, newIndex).map((round, idx) => ({
              ...round,
              order: idx + 1,
            }));
            applyReorder(nextRounds);
          }}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext items={orderedRounds.map((round) => round.id)} strategy={verticalListSortingStrategy}>
            <motion.div layout className={cn("space-y-2", reorderMode && "rounded-lg border border-dashed border-slate-200 p-2")}>
              <AnimatePresence initial={false}>
                {orderedRounds.map((round, index) => {
                  const showDirty = editRound?.id === round.id && editDirty;
                  return (
                    <RoundRow
                      key={round.id}
                      round={round}
                      packId={packId}
                      showDirty={showDirty}
                      pendingAction={pendingAction}
                      reorderMode={reorderMode}
                      reducedMotion={reducedMotion}
                      index={index}
                      onEdit={() => setEditRound(round)}
                      onDelete={() => setDeleteRound(round)}
                    />
                  );
                })}
              </AnimatePresence>
            </motion.div>
          </SortableContext>
        </DndContext>
      )}

      <RoundFormDialog mode="create" open={createOpen} onOpenChange={setCreateOpen} packId={packId} />
      <RoundFormDialog
        mode="edit"
        open={Boolean(editRound)}
        onOpenChange={(open) => {
          if (!open) {
            setEditRound(null);
            setEditDirty(false);
          }
        }}
        packId={packId}
        initial={editRound}
        onDirtyChange={setEditDirty}
      />

      <AlertDialog open={Boolean(deleteRound)} onOpenChange={(open) => !open && setDeleteRound(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete round?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteRound
                ? `This will remove "${deleteRound.title}" and all questions in this round.`
                : "This action is irreversible."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button type="button" variant="outline" disabled={pendingAction !== null}>
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                type="button"
                className="bg-red-700 text-white hover:bg-red-800"
                disabled={pendingAction !== null}
                onClick={confirmDelete}
              >
                {pendingAction?.startsWith("delete:") ? "Deleting..." : "Delete round"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={generateConfirmOpen} onOpenChange={setGenerateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Overwrite existing rounds?</AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite existing rounds in this pack with the standard Zakovat 7-round template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button type="button" variant="outline" disabled={pendingAction !== null}>
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                type="button"
                disabled={pendingAction !== null}
                onClick={runGenerateTemplate}
              >
                {pendingAction === "generate-template" ? "Generating..." : "Overwrite and generate"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </section>
    </TooltipProvider>
  );
}
