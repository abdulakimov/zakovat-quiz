export type FeatureAccentKey = "packs" | "teams" | "presenter" | "media" | "settings";

export type AccentTokens = {
  background: string;
  icon: string;
  badge: string;
};

export const FEATURE_ACCENTS: Record<FeatureAccentKey, AccentTokens> = {
  packs: {
    background: "bg-sky-50",
    icon: "text-sky-600",
    badge: "border-sky-200 bg-sky-50 text-sky-700",
  },
  teams: {
    background: "bg-amber-50",
    icon: "text-amber-600",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
  },
  presenter: {
    background: "bg-indigo-50",
    icon: "text-indigo-600",
    badge: "border-indigo-200 bg-indigo-50 text-indigo-700",
  },
  media: {
    background: "bg-emerald-50",
    icon: "text-emerald-600",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  settings: {
    background: "bg-slate-50",
    icon: "text-slate-600",
    badge: "border-slate-200 bg-slate-50 text-slate-700",
  },
};

export function getFeatureAccent(key: FeatureAccentKey): AccentTokens {
  return FEATURE_ACCENTS[key];
}
