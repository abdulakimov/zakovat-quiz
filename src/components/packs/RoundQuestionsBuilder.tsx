"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteQuestionAction, reorderQuestionsAction } from "@/src/actions/questions";
import { ActionGroup } from "@/src/components/ui/action-group";
import { IconButton } from "@/src/components/ui/icon-button";
import { toast } from "@/src/components/ui/sonner";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { getFeatureAccent } from "@/src/lib/featureAccent";
import { ArrowUpRightIcon, CheckCircle2Icon, ClockIcon, FilmIcon, ImageIcon, ListChecksIcon, MusicIcon, PencilIcon, PlusIcon, TrashIcon } from "@/src/ui/icons";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
// Icons now centralized in src/ui/icons.ts

type QuestionType = "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "OPTIONS";
type AnswerType = "TEXT" | "IMAGE" | "AUDIO" | "VIDEO";
type MediaType = "IMAGE" | "VIDEO" | "AUDIO";

type Asset = {
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
    asset: Asset;
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

function questionBadgeLabel(type: QuestionType) {
  if (type === "IMAGE") return "RASM";
  if (type === "OPTIONS") return "VARIANT";
  return type;
}

function timerLabel(q: QuestionItem, round: RoundInfo) {
  return `${round.defaultTimerSec}s`;
}

function typeIcon(type: QuestionType) {
  if (type === "IMAGE") return ImageIcon;
  if (type === "AUDIO") return MusicIcon;
  if (type === "VIDEO") return FilmIcon;
  if (type === "OPTIONS") return ListChecksIcon;
  return CheckCircle2Icon;
}

function answerIcon(type: AnswerType) {
  if (type === "IMAGE") return ImageIcon;
  if (type === "AUDIO") return MusicIcon;
  if (type === "VIDEO") return FilmIcon;
  return CheckCircle2Icon;
}

function QuestionRow({
  q,
  index,
  round,
  accent,
  packId,
  pendingAction,
  reorderMode,
  reducedMotion,
  onDelete,
}: {
  q: QuestionItem;
  index: number;
  round: RoundInfo;
  accent: ReturnType<typeof getFeatureAccent>;
  packId: string;
  pendingAction: string | null;
  reorderMode: boolean;
  reducedMotion: boolean | null;
  onDelete: (q: QuestionItem) => void;
}) {
  const primary = q.media.find((m) => m.role === "QUESTION_PRIMARY")?.asset;
  const answerPrimary = q.media.find((m) => m.role === "ANSWER_PRIMARY")?.asset;
  const TypeIcon = typeIcon(q.type);
  const AnswerIcon = answerIcon(q.answerType);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: q.id,
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
      ref={setNodeRef}
      style={style}
      layout
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
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="truncate font-medium text-slate-900">
              {q.order}. {q.text}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className={cn("border", accent.badge)}>
                <TypeIcon className="mr-1 h-3.5 w-3.5" aria-hidden />
                {questionBadgeLabel(q.type)}
              </Badge>
              <Badge variant="secondary">
                <ClockIcon className="mr-1 h-3.5 w-3.5" aria-hidden />
                {timerLabel(q, round)}
              </Badge>
              {primary ? (
                <Badge variant="secondary">
                  <MusicIcon className="mr-1 h-3.5 w-3.5" aria-hidden />
                  Media
                </Badge>
              ) : null}
              <Badge variant="outline" className={cn("border", accent.badge)}>
                <AnswerIcon className="mr-1 h-3.5 w-3.5" aria-hidden />
                {q.answerType}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              {primary ? <span className="truncate">Q media: {primary.originalName}</span> : null}
              {answerPrimary ? <span className="truncate">A media: {answerPrimary.originalName}</span> : null}
            </div>
          </div>

          <ActionGroup>
            <IconButton
              label="Edit question"
              tooltip="Edit"
              disabled={pendingAction !== null}
              asChild
              onPointerDown={(event) => event.stopPropagation()}
            >
              <Link href={`/app/packs/${packId}/rounds/${round.id}/questions/${q.id}/edit`}>
                <PencilIcon className="h-4 w-4" />
              </Link>
            </IconButton>
            <IconButton
              label="Delete question"
              tooltip="Delete"
              className="text-red-600 hover:text-red-700"
              disabled={pendingAction !== null || reorderMode}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onDelete(q)}
            >
              <TrashIcon className="h-4 w-4" />
            </IconButton>
          </ActionGroup>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function RoundQuestionsBuilder({
  packId,
  round,
  questions,
}: {
  packId: string;
  round: RoundInfo;
  questions: QuestionItem[];
}) {
  const router = useRouter();
  const accent = getFeatureAccent("media");
  const [reorderMode, setReorderMode] = React.useState(false);
  const [orderedQuestions, setOrderedQuestions] = React.useState<QuestionItem[]>(questions);
  const [deleteQuestion, setDeleteQuestion] = React.useState<QuestionItem | null>(null);
  const [pendingAction, setPendingAction] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();
  const reducedMotion = useReducedMotion();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  React.useEffect(() => {
    setOrderedQuestions(questions);
  }, [questions]);

  const applyReorder = React.useCallback(
    (nextQuestions: QuestionItem[]) => {
      setOrderedQuestions(nextQuestions);
      setPendingAction("reorder");
      startTransition(() => {
        void (async () => {
          const fd = new FormData();
          fd.set("packId", packId);
          fd.set("roundId", round.id);
          fd.set("orderedQuestionIds", JSON.stringify(nextQuestions.map((q) => q.id)));
          const result = await reorderQuestionsAction({}, fd);
          if (result?.error) {
            toast.error(result.error);
            setOrderedQuestions(questions);
          } else {
            toast.success(result?.success ?? "Question order updated.");
            router.refresh();
          }
          setPendingAction(null);
        })();
      });
    },
    [packId, questions, round.id, router, startTransition],
  );

  function confirmDelete() {
    if (!deleteQuestion) return;
    setPendingAction(`delete:${deleteQuestion.id}`);
    startTransition(() => {
      void (async () => {
        const fd = new FormData();
        fd.set("packId", packId);
        fd.set("roundId", round.id);
        fd.set("questionId", deleteQuestion.id);
        const result = await deleteQuestionAction(fd);
        if (result?.error) toast.error(result.error);
        else {
          toast.success(result?.success ?? "Question deleted.");
          setDeleteQuestion(null);
          router.refresh();
        }
        setPendingAction(null);
      })();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">
                {round.order}. {round.title}
              </CardTitle>
              <p className="text-sm text-slate-600">
                Default type: {round.defaultQuestionType} | Default timer: {round.defaultTimerSec}s
              </p>
              {round.description ? <p className="text-xs text-slate-500">{round.description}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {reorderMode ? <span className="text-xs text-slate-500">Drag questions to reorder</span> : null}
              <Button asChild variant="outline" size="sm">
                <Link href={`/app/packs/${packId}`}>
                  <ArrowUpRightIcon className="mr-1 h-4 w-4 rotate-180" />
                  Back to pack
                </Link>
              </Button>
              <Button asChild type="button" size="sm">
                <Link href={`/app/packs/${packId}/rounds/${round.id}/questions/new`}>
                  <PlusIcon className="mr-2 h-4 w-4" aria-hidden />
                  Add question
                </Link>
              </Button>
              <Button
                type="button"
                size="sm"
                variant={reorderMode ? "default" : "outline"}
                onClick={() => setReorderMode((v) => !v)}
                disabled={pendingAction !== null}
              >
                {reorderMode ? "Done" : "Reorder"}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {questions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <ListChecksIcon className="h-4 w-4" />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-900">No questions yet</p>
            <p className="mt-1 text-sm text-slate-600">Create the first question for this round.</p>
            <Button asChild type="button" className="mt-4">
              <Link href={`/app/packs/${packId}/rounds/${round.id}/questions/new`}>
                <PlusIcon className="mr-2 h-4 w-4" aria-hidden />
                Add question
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={reorderMode ? sensors : undefined}
          collisionDetection={closestCenter}
          onDragStart={() => {}}
          onDragCancel={() => {}}
          onDragEnd={(event) => {
            const { active, over } = event;
            if (!over || active.id === over.id) return;
            const oldIndex = orderedQuestions.findIndex((q) => q.id === active.id);
            const newIndex = orderedQuestions.findIndex((q) => q.id === over.id);
            if (oldIndex < 0 || newIndex < 0) return;
            const nextQuestions = arrayMove(orderedQuestions, oldIndex, newIndex).map((q, idx) => ({ ...q, order: idx + 1 }));
            applyReorder(nextQuestions);
          }}
        >
          <SortableContext items={orderedQuestions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
            <motion.div layout className={cn("space-y-2", reorderMode && "rounded-lg border border-dashed border-slate-200 p-2")}>
              <AnimatePresence initial={false}>
                {orderedQuestions.map((q, index) => (
                  <QuestionRow
                    key={q.id}
                    q={q}
                    index={index}
                    round={round}
                    accent={accent}
                    packId={packId}
                    pendingAction={pendingAction}
                    reorderMode={reorderMode}
                    reducedMotion={reducedMotion}
                    onDelete={setDeleteQuestion}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          </SortableContext>
        </DndContext>
      )}

      <AlertDialog open={Boolean(deleteQuestion)} onOpenChange={(open) => !open && setDeleteQuestion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete question?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteQuestion ? `This will permanently delete question ${deleteQuestion.order}.` : "This action is irreversible."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" disabled={pendingAction !== null}>
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button className="bg-red-700 text-white hover:bg-red-800" onClick={confirmDelete} disabled={pendingAction !== null}>
                {pendingAction?.startsWith("delete:") ? "Deleting..." : "Delete question"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
