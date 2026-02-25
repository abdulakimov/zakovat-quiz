import type { PresenterSlide } from "@/src/actions/presenter";

export type PresenterItem =
  | { kind: "ROUND_INTRO"; roundId: string }
  | { kind: "ASK_READ"; roundId: string; questionId: string }
  | { kind: "ASK_MEDIA"; roundId: string; questionId: string }
  | { kind: "ASK_TIMER"; roundId: string; questionId: string }
  | { kind: "RECAP_INTRO"; roundId: string }
  | { kind: "RECAP_QUESTION"; roundId: string; questionId: string }
  | { kind: "WRITE_ANSWERS"; roundId: string; durationSec: number }
  | { kind: "REVEAL_INTRO"; roundId: string }
  | { kind: "REVEAL_QUESTION"; roundId: string; questionId: string }
  | { kind: "REVEAL_ANSWER"; roundId: string; questionId: string };

type RoundIntroSlide = Extract<PresenterSlide, { kind: "roundIntro" }>;
export type QuestionSlide = Extract<PresenterSlide, { kind: "question" }>;

type PresenterDeck = {
  items: PresenterItem[];
  roundsById: Map<string, RoundIntroSlide>;
  questionsById: Map<string, QuestionSlide>;
  questionsByRound: Map<string, QuestionSlide[]>;
};

type DeckOptions = {
  writeDurationSec: number;
  recapEnabledByRound?: Map<string, boolean>;
};

export function buildPresenterDeck(slides: PresenterSlide[], options: DeckOptions): PresenterDeck {
  const rounds = slides.filter((slide): slide is RoundIntroSlide => slide.kind === "roundIntro");
  const questions = slides.filter((slide): slide is QuestionSlide => slide.kind === "question");

  const roundsById = new Map<string, RoundIntroSlide>();
  const questionsById = new Map<string, QuestionSlide>();
  const questionsByRound = new Map<string, QuestionSlide[]>();

  for (const round of rounds) {
    roundsById.set(round.roundId, round);
  }

  for (const question of questions) {
    questionsById.set(question.questionId, question);
    const list = questionsByRound.get(question.roundId) ?? [];
    list.push(question);
    questionsByRound.set(question.roundId, list);
  }

  for (const [roundId, list] of questionsByRound.entries()) {
    list.sort((a, b) => a.questionOrder - b.questionOrder);
    questionsByRound.set(roundId, list);
  }

  const orderedRounds = [...rounds].sort((a, b) => a.roundOrder - b.roundOrder);
  const items: PresenterItem[] = [];

  for (const round of orderedRounds) {
    const list = questionsByRound.get(round.roundId) ?? [];
    const recapEnabled = options.recapEnabledByRound?.get(round.roundId) ?? true;

    items.push({ kind: "ROUND_INTRO", roundId: round.roundId });

    for (const question of list) {
      items.push({ kind: "ASK_READ", roundId: round.roundId, questionId: question.questionId });
      if (
        (question.questionType === "AUDIO" || question.questionType === "VIDEO") &&
        question.primaryMedia
      ) {
        items.push({ kind: "ASK_MEDIA", roundId: round.roundId, questionId: question.questionId });
      }
      items.push({ kind: "ASK_TIMER", roundId: round.roundId, questionId: question.questionId });
    }

    if (recapEnabled && list.length >= 2) {
      items.push({ kind: "RECAP_INTRO", roundId: round.roundId });
      for (const question of list) {
        items.push({ kind: "RECAP_QUESTION", roundId: round.roundId, questionId: question.questionId });
      }
    }

    items.push({ kind: "WRITE_ANSWERS", roundId: round.roundId, durationSec: options.writeDurationSec });
    items.push({ kind: "REVEAL_INTRO", roundId: round.roundId });

    for (const question of list) {
      items.push({ kind: "REVEAL_QUESTION", roundId: round.roundId, questionId: question.questionId });
      items.push({ kind: "REVEAL_ANSWER", roundId: round.roundId, questionId: question.questionId });
    }
  }

  return { items, roundsById, questionsById, questionsByRound };
}
