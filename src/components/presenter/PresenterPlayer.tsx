"use client";

import * as React from "react";
import type { PresenterSlide } from "@/src/actions/presenter";
import { AudioManager } from "@/src/lib/audioManager";
import { buildPresenterDeck, type PresenterItem } from "@/src/lib/presenterDeck";
import { findIndexForLoc, getLocForItem, parseLoc, serializeLoc } from "@/src/lib/presenterLocation";
import { presenterReducer, type PresenterContext, type PresenterState } from "@/src/lib/presenter/reducer";
import { PresenterShell } from "@/src/components/presenter/PresenterShell";
import { SlideRenderer } from "@/src/components/presenter/SlideRenderer";
import { toast } from "@/src/components/ui/sonner";

type PackMeta = {
  id: string;
  title: string;
  breakTimerSec?: number | null;
  breakMusicUrl?: string | null;
  timerMusicUrl?: string | null;
};

const PRESENTER_VOLUME_KEY = "presenter_volume_v2";

type MediaInfo = {
  kind: "IMAGE" | "VIDEO" | "AUDIO";
  url: string;
  name: string;
};

type PendingClip = {
  key: string;
  media: MediaInfo;
};

function getItemKey(item: PresenterItem) {
  return [item.kind, item.roundId, "questionId" in item ? item.questionId : ""].join("|");
}

const initialState: PresenterState = {
  index: 0,
  timerStatus: "IDLE",
  timerDurationMs: 0,
  timerRemainingMs: 0,
  timerStartedAtMs: null,
};

export function PresenterPlayer({ pack, slides }: { pack: PackMeta; slides: PresenterSlide[] }) {
  const storageKey = `quiz_creator.presenter.loc.${pack.id}`;
  const rawWriteDuration = pack.breakTimerSec && pack.breakTimerSec > 0 ? pack.breakTimerSec : 60;
  const safeWriteDuration = rawWriteDuration > 0 ? rawWriteDuration : 60;
  if (process.env.NODE_ENV !== "production" && rawWriteDuration <= 0) {
    // eslint-disable-next-line no-console
    console.warn("WRITE_ANSWERS duration invalid, falling back to 60s.");
  }
  const writeDurationSec = Math.min(300, Math.max(10, safeWriteDuration));

  const deck = React.useMemo(() => buildPresenterDeck(slides, { writeDurationSec }), [slides, writeDurationSec]);

  const context = React.useMemo<PresenterContext>(() => {
    return {
      items: deck.items,
      writeDurationSec,
      getQuestionTimerSec: (questionId) => deck.questionsById.get(questionId)?.timerSec ?? 60,
    };
  }, [deck.items, deck.questionsById, writeDurationSec]);

  const [state, dispatch] = React.useReducer(
    (current: PresenterState, event: Parameters<typeof presenterReducer>[1]) => presenterReducer(current, event, context),
    initialState,
  );

  const [volume, setVolume] = React.useState(80);
  const [audioWarning, setAudioWarning] = React.useState<string | null>(null);
  const [mediaHint, setMediaHint] = React.useState<string | null>(null);

  const didInitRef = React.useRef(false);
  const lastLocRef = React.useRef<string | null>(null);
  const pendingClipRef = React.useRef<PendingClip | null>(null);
  const lastNextAtRef = React.useRef<number>(0);
  const lastNavRef = React.useRef<"next" | "prev" | "set">("set");

  const audioRef = React.useRef<AudioManager | null>(null);

  const current = deck.items[state.index];
  const currentKey = current ? getItemKey(current) : "";

  const currentQuestion =
    current && "questionId" in current ? deck.questionsById.get(current.questionId) ?? null : null;
  const currentRound = current ? deck.roundsById.get(current.roundId) ?? null : null;
  const currentRoundTitle = currentQuestion?.roundTitle ?? currentRound?.roundTitle ?? "";
  const currentRoundCount = currentRound?.questionCount ?? 0;
  const roundQuestions = current?.roundId ? deck.questionsByRound.get(current.roundId) ?? [] : [];
  const currentQuestionIndex = currentQuestion
    ? (() => {
        const idx = roundQuestions.findIndex((q) => q.questionId === currentQuestion.questionId);
        return idx >= 0 ? idx + 1 : null;
      })()
    : null;

  const phaseLabel =
    current?.kind === "ASK_READ" || current?.kind === "ASK_MEDIA" || current?.kind === "ASK_TIMER"
      ? "Asking"
      : current?.kind === "RECAP_INTRO" || current?.kind === "RECAP_QUESTION"
        ? "Recap"
        : current?.kind === "WRITE_ANSWERS"
          ? "Write"
          : current?.kind === "REVEAL_QUESTION" || current?.kind === "REVEAL_ANSWER" || current?.kind === "REVEAL_INTRO"
            ? "Reveal"
            : "Round";

  const questionHasClip = Boolean(
    currentQuestion &&
      currentQuestion.primaryMedia &&
      (currentQuestion.questionType === "AUDIO" || currentQuestion.questionType === "VIDEO"),
  );

  const hintText =
    current?.kind === "ASK_READ"
      ? questionHasClip
        ? "Press Next to play clip"
        : "Press Next to start timer"
      : current?.kind === "ASK_MEDIA"
        ? "Press Next to start timer"
        : current?.kind === "ASK_TIMER"
          ? "Press Next to skip"
          : current?.kind === "RECAP_INTRO" || current?.kind === "RECAP_QUESTION"
            ? "Press Next to continue"
            : current?.kind === "WRITE_ANSWERS"
              ? "Press Next to skip"
              : current?.kind === "REVEAL_INTRO"
                ? "Press Next to continue"
                : current?.kind === "REVEAL_QUESTION"
                  ? "Press Next to show answer"
                  : current?.kind === "REVEAL_ANSWER"
                    ? "Press Next for next question"
                    : null;

  const showTimer = current?.kind === "ASK_TIMER" || current?.kind === "WRITE_ANSWERS";

  React.useEffect(() => {
    const manager = new AudioManager();
    audioRef.current = manager;

    const saved = window.localStorage.getItem(PRESENTER_VOLUME_KEY);
    const parsed = saved ? Number(saved) : NaN;
    const initial = Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 80;
    setVolume(initial);
    manager.setVolume(initial / 100);

    return () => {
      manager.dispose();
      audioRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.setVolume(volume / 100);
      window.localStorage.setItem(PRESENTER_VOLUME_KEY, String(volume));
    }
  }, [volume]);

  React.useEffect(() => {
    if (!didInitRef.current && deck.items.length > 0) {
      didInitRef.current = true;
      const params = new URLSearchParams(window.location.search);
      if (params.get("new") === "1") {
        window.sessionStorage.removeItem(storageKey);
        params.delete("new");
        const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
        window.history.replaceState({}, "", nextUrl);
      }

      const stored = window.sessionStorage.getItem(storageKey);
      const parsedFromStorage = parseLoc(stored ?? null);
      const pickLoc = parsedFromStorage;

      let nextIndex: number | null = null;
      if (pickLoc) {
        nextIndex = findIndexForLoc(deck.items, pickLoc);
        if (nextIndex == null && pickLoc.roundId) {
          const fallback = deck.items.findIndex((item) => item.roundId === pickLoc.roundId);
          if (fallback >= 0) nextIndex = fallback;
        }
      }
      if (nextIndex == null) nextIndex = 0;
      lastNavRef.current = "set";
      dispatch({ type: "SET_INDEX", index: nextIndex });
    }
  }, [deck.items, storageKey]);

  React.useEffect(() => {
    if (!didInitRef.current) return;
    const item = deck.items[state.index];
    if (!item) return;
    const loc = serializeLoc(getLocForItem(item));
    if (loc === lastLocRef.current) return;
    lastLocRef.current = loc;
    try {
      window.sessionStorage.setItem(storageKey, loc);
    } catch {}
  }, [deck.items, state.index, storageKey]);

  React.useEffect(() => {
    if (state.timerStatus !== "RUNNING") return;
    const tick = () => dispatch({ type: "TIMER_TICK", nowMs: Date.now() });
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [state.timerStatus]);

  React.useEffect(() => {
    setMediaHint(null);
    if (!current) return;
    if (lastNavRef.current !== "next") return;
    if (current.kind !== "ASK_MEDIA" && current.kind !== "REVEAL_ANSWER") return;
    const question = deck.questionsById.get(current.questionId);
    if (!question) return;
    if (current.kind === "ASK_MEDIA") {
      if (!question.primaryMedia || (question.questionType !== "AUDIO" && question.questionType !== "VIDEO")) return;
      pendingClipRef.current = {
        key: currentKey,
        media: { kind: question.primaryMedia.type, url: question.primaryMedia.url, name: question.primaryMedia.name },
      };
    } else {
      if (!question.answerPrimaryMedia || (question.answerPrimaryMedia.type !== "AUDIO" && question.answerPrimaryMedia.type !== "VIDEO")) return;
      pendingClipRef.current = {
        key: currentKey,
        media: {
          kind: question.answerPrimaryMedia.type,
          url: question.answerPrimaryMedia.url,
          name: question.answerPrimaryMedia.name,
        },
      };
    }
  }, [current, currentKey, deck.questionsById]);

  React.useEffect(() => {
    const pending = pendingClipRef.current;
    if (!pending || pending.key !== currentKey) return;
    pendingClipRef.current = null;
    const manager = audioRef.current;
    if (!manager) return;
    manager.stopTimer();
    void manager.playClip(pending.media.url).catch(() => setMediaHint("Press play to start audio."));
  }, [currentKey]);

  React.useEffect(() => {
    const manager = audioRef.current;
    if (!manager) return;
    if (state.timerStatus === "RUNNING" && current && (current.kind === "ASK_TIMER" || current.kind === "WRITE_ANSWERS")) {
      const url = current.kind === "ASK_TIMER" ? pack.timerMusicUrl ?? null : pack.breakMusicUrl ?? null;
      void manager.playTimer(url, { loop: true }).catch(() => {
        toast.error("Presenter audio could not start.");
      });
      return;
    }
    manager.stopTimer();
  }, [current, pack.breakMusicUrl, pack.timerMusicUrl, state.timerStatus]);

  const stopAllAudio = React.useCallback(() => {
    audioRef.current?.stopAll();
  }, []);

  const handlePrev = React.useCallback(() => {
    lastNavRef.current = "prev";
    stopAllAudio();
    dispatch({ type: "PREV" });
  }, [stopAllAudio]);

  const handleNext = React.useCallback(() => {
    if (!current) return;
    const now = Date.now();
    if (now - lastNextAtRef.current < 120) return;
    lastNextAtRef.current = now;
    lastNavRef.current = "next";
    stopAllAudio();
    dispatch({ type: "NEXT", nowMs: now });
  }, [current, stopAllAudio]);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " " || event.key === "Enter") {
        event.preventDefault();
        handleNext();
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleNext, handlePrev]);

  const toggleFullscreen = React.useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
      return;
    }
    void document.documentElement.requestFullscreen?.();
  }, []);

  const restartPresenter = React.useCallback(() => {
    try {
      window.sessionStorage.removeItem(storageKey);
    } catch {}
    stopAllAudio();
    lastNavRef.current = "set";
    dispatch({ type: "SET_INDEX", index: 0 });
  }, [storageKey, stopAllAudio]);

  if (!current) return null;

  const progressLabel = currentQuestionIndex
    ? `Q${currentQuestionIndex}/${roundQuestions.length || 0}`
    : `Q-/${currentRoundCount}`;

  return (
    <PresenterShell
      packTitle={pack.title}
      roundTitle={currentRoundTitle || "Round"}
      phaseLabel={phaseLabel}
      progressLabel={progressLabel}
      volume={volume}
      onVolumeChange={setVolume}
      onPrev={handlePrev}
      onNext={handleNext}
      canPrev={state.index > 0}
      canNext={state.index < deck.items.length - 1}
      hint={hintText}
      onToggleFullscreen={toggleFullscreen}
      backHref={`/app/packs/${pack.id}`}
      onRestart={restartPresenter}
      audioWarning={audioWarning}
    >
      <SlideRenderer
        item={current}
        question={currentQuestion}
        roundTitle={currentRoundTitle}
        timer={{
          show: showTimer && state.timerDurationMs > 0,
          remainingMs: state.timerRemainingMs || state.timerDurationMs,
          durationMs: state.timerDurationMs,
        }}
        writeDurationSec={writeDurationSec}
        setClipRef={(el) => audioRef.current?.setClipElement(el)}
        mediaHint={mediaHint}
      />
    </PresenterShell>
  );
}
