export type FeatureAccentKey = "packs" | "teams" | "presenter" | "media" | "settings";

export type AccentTokens = {
  background: string;
  icon: string;
  badge: string;
};

export const FEATURE_ACCENTS: Record<FeatureAccentKey, AccentTokens> = {
  packs: {
    background: "bg-muted",
    icon: "text-muted-foreground",
    badge: "border-border bg-muted text-muted-foreground",
  },
  teams: {
    background: "bg-muted",
    icon: "text-muted-foreground",
    badge: "border-border bg-muted text-muted-foreground",
  },
  presenter: {
    background: "bg-muted",
    icon: "text-muted-foreground",
    badge: "border-border bg-muted text-muted-foreground",
  },
  media: {
    background: "bg-muted",
    icon: "text-muted-foreground",
    badge: "border-border bg-muted text-muted-foreground",
  },
  settings: {
    background: "bg-muted",
    icon: "text-muted-foreground",
    badge: "border-border bg-muted text-muted-foreground",
  },
};

export function getFeatureAccent(key: FeatureAccentKey): AccentTokens {
  return FEATURE_ACCENTS[key];
}
