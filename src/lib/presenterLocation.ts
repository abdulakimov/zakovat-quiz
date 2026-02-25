import type { PresenterItem } from "@/src/lib/presenterDeck";

export type PresenterLoc = {
  kind: string;
  roundId?: string;
  questionId?: string;
};

const SEP = "|";

export function serializeLoc(loc: PresenterLoc): string {
  const round = loc.roundId ?? "";
  const question = loc.questionId ?? "";
  return [loc.kind, round, question].join(SEP);
}

export function parseLoc(raw: string | null | undefined): PresenterLoc | null {
  if (!raw) return null;
  const parts = raw.split(SEP);
  if (parts.length < 1) return null;
  const kind = parts[0]?.trim();
  if (!kind) return null;
  const roundId = parts[1]?.trim() || undefined;
  const questionId = parts[2]?.trim() || undefined;
  return { kind, roundId, questionId };
}

export function getLocForItem(item: PresenterItem): PresenterLoc {
  if ("questionId" in item) {
    return { kind: item.kind, roundId: item.roundId, questionId: item.questionId };
  }
  return { kind: item.kind, roundId: item.roundId };
}

export function findIndexForLoc(items: PresenterItem[], loc: PresenterLoc): number | null {
  const idx = items.findIndex((item) => {
    if (item.kind !== loc.kind) return false;
    if (loc.roundId && item.roundId !== loc.roundId) return false;
    if ("questionId" in item && loc.questionId && item.questionId !== loc.questionId) return false;
    if (!("questionId" in item) && loc.questionId) return false;
    return true;
  });
  return idx >= 0 ? idx : null;
}
