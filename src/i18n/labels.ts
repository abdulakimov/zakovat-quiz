type T = (key: string, values?: Record<string, string | number | Date>) => string;

export type QuestionType = "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "OPTIONS";
export type PackVisibility = "DRAFT" | "PRIVATE" | "PUBLIC";

export function questionTypeLabel(t: T, type: QuestionType): string {
  switch (type) {
    case "TEXT":
      return t("roundType.text");
    case "IMAGE":
      return t("roundType.image");
    case "VIDEO":
      return t("roundType.video");
    case "AUDIO":
      return t("roundType.audio");
    case "OPTIONS":
      return t("roundType.options");
    default:
      return type;
  }
}

export function packVisibilityLabel(t: T, visibility: PackVisibility): string {
  switch (visibility) {
    case "PUBLIC":
      return t("visibility.public");
    case "PRIVATE":
      return t("visibility.private");
    case "DRAFT":
    default:
      return t("visibility.draft");
  }
}
