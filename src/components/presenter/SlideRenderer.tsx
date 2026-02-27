"use client";

import * as React from "react";
import type { PresenterItem, QuestionSlide } from "@/src/lib/presenterDeck";
import { useTranslations } from "@/src/i18n/client";
import { MinimalMedia } from "@/src/components/presenter/MinimalMedia";
import { MinimalTimer } from "@/src/components/presenter/MinimalTimer";

type MediaInfo = {
  kind: "IMAGE" | "VIDEO" | "AUDIO";
  url: string;
  name: string;
};

function QuestionText({ question }: { question: QuestionSlide }) {
  const letters = ["A", "B", "C", "D"];
  return (
    <div className="space-y-6">
      <div className="text-sm text-slate-500">Q{question.questionOrder}</div>
      <p className="whitespace-pre-wrap text-3xl font-semibold leading-relaxed text-slate-900 sm:text-4xl">
        {question.text}
      </p>
      {question.questionType === "OPTIONS" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {question.options.map((opt, idx) => (
            <div key={opt.order} className="rounded-lg border border-slate-200 px-4 py-3 text-lg text-slate-800">
              <span className="mr-2 text-xs font-semibold text-slate-400">{letters[idx] ?? opt.order}</span>
              {opt.text}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SlideRenderer({
  item,
  question,
  roundTitle,
  timer,
  writeDurationSec,
  setClipRef,
  mediaHint,
}: {
  item: PresenterItem;
  question: QuestionSlide | null;
  roundTitle: string;
  timer: { show: boolean; remainingMs: number; durationMs: number };
  writeDurationSec: number;
  setClipRef: (el: HTMLMediaElement | null) => void;
  mediaHint: string | null;
}) {
  const tPresenter = useTranslations("presenter");
  const showQuestion = Boolean(question);
  const questionImage: MediaInfo | null =
    question?.primaryMedia && question.primaryMedia.type === "IMAGE"
      ? { kind: "IMAGE", url: question.primaryMedia.url, name: question.primaryMedia.name }
      : null;

  const askMedia: MediaInfo | null =
    question?.primaryMedia && (question.questionType === "AUDIO" || question.questionType === "VIDEO")
      ? { kind: question.primaryMedia.type, url: question.primaryMedia.url, name: question.primaryMedia.name }
      : null;

  const answerMedia: MediaInfo | null =
    question?.answerPrimaryMedia
      ? { kind: question.answerPrimaryMedia.type, url: question.answerPrimaryMedia.url, name: question.answerPrimaryMedia.name }
      : null;
  const effectiveAnswerMedia = answerMedia;

  const showMediaColumn =
    (item.kind === "ASK_MEDIA" && askMedia) ||
    (item.kind === "ASK_READ" && questionImage) ||
    (item.kind === "ASK_TIMER" && questionImage) ||
    (item.kind === "REVEAL_QUESTION" && questionImage) ||
    (item.kind === "RECAP_QUESTION" && questionImage) ||
    (item.kind === "REVEAL_ANSWER" && effectiveAnswerMedia);

  return (
    <div className="relative flex h-full flex-1 flex-col">
      {timer.show ? (
        <div className="absolute right-0 top-0">
          <MinimalTimer remainingMs={timer.remainingMs} durationMs={timer.durationMs} />
        </div>
      ) : null}

      {item.kind === "ROUND_INTRO" ? (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{tPresenter("phaseRound")}</p>
          <h1 className="mt-3 text-4xl font-semibold text-slate-900 sm:text-6xl">{roundTitle}</h1>
        </div>
      ) : null}

      {item.kind === "RECAP_INTRO" ? (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{tPresenter("phaseRecap")}</p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-5xl">{tPresenter("recapTitle")}</h2>
          <p className="mt-3 text-sm text-slate-500">{roundTitle}</p>
        </div>
      ) : null}

      {item.kind === "WRITE_ANSWERS" ? (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{tPresenter("phaseWrite")}</p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-5xl">{tPresenter("writeAnswersTitle")}</h2>
          <p className="mt-3 text-sm text-slate-500">{roundTitle}</p>
          <p className="mt-2 text-2xl text-slate-900">{tPresenter("seconds", { count: writeDurationSec })}</p>
        </div>
      ) : null}

      {item.kind === "REVEAL_INTRO" ? (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{tPresenter("phaseReveal")}</p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-5xl">{tPresenter("revealTitle")}</h2>
          <p className="mt-3 text-sm text-slate-500">{roundTitle}</p>
        </div>
      ) : null}

      {showQuestion ? (
        <div className={showMediaColumn ? "grid flex-1 gap-10 lg:grid-cols-[1.2fr_0.8fr]" : "flex flex-1 items-center"}>
          <div className={showMediaColumn ? "flex flex-col justify-center" : "mx-auto max-w-4xl"}>
            <QuestionText question={question!} />

            {item.kind === "REVEAL_ANSWER" ? (
              <div className="mt-8 space-y-2">
                <p className="text-xs text-slate-500">{tPresenter("answer")}</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {question?.answerText ?? question?.answer ?? ""}
                </p>
                {question?.explanation ? <p className="text-sm text-slate-500">{question.explanation}</p> : null}
              </div>
            ) : null}
          </div>

          {showMediaColumn ? (
            <div className="flex flex-col justify-center">
              {item.kind === "ASK_MEDIA" && askMedia ? (
                <MinimalMedia media={askMedia} setClipRef={setClipRef} hint={mediaHint} />
              ) : null}
              {item.kind === "REVEAL_ANSWER" && effectiveAnswerMedia ? (
                <MinimalMedia media={effectiveAnswerMedia} setClipRef={setClipRef} hint={mediaHint} />
              ) : null}
              {(item.kind === "ASK_READ" || item.kind === "ASK_TIMER" || item.kind === "REVEAL_QUESTION" || item.kind === "RECAP_QUESTION") && questionImage ? (
                <MinimalMedia media={questionImage} />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
