export type RoundIconKey =
  | "rasminka"
  | "dtm"
  | "soundtrack"
  | "kinomania"
  | "zanjir"
  | "penalty"
  | "vabank"
  | "default";

export function getRoundIconKey(roundTitle: string): RoundIconKey {
  const title = roundTitle.trim().toLowerCase();
  if (!title) return "default";
  if (title.includes("rasm")) return "rasminka";
  if (title.includes("dtm")) return "dtm";
  if (title.includes("sound") || title.includes("musi")) return "soundtrack";
  if (title.includes("kino")) return "kinomania";
  if (title.includes("zanj")) return "zanjir";
  if (title.includes("penal") || title.includes("pen")) return "penalty";
  if (title.includes("futquiz") || title.includes("fut")) return "penalty";
  if (title.includes("vab") || title.includes("va bank")) return "vabank";
  return "default";
}
