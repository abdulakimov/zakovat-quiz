import { Badge } from "@/components/ui/badge";
import { useTranslations } from "@/src/i18n/client";
import { packVisibilityLabel, type PackVisibility } from "@/src/i18n/labels";

export function PackVisibilityBadge({ visibility }: { visibility: PackVisibility }) {
  const tPacks = useTranslations("packs");

  if (visibility === "PUBLIC") return <Badge data-testid="badge-status" variant="success">{packVisibilityLabel(tPacks, visibility)}</Badge>;
  if (visibility === "PRIVATE") return <Badge data-testid="badge-status" variant="secondary">{packVisibilityLabel(tPacks, visibility)}</Badge>;
  return <Badge data-testid="badge-status">{packVisibilityLabel(tPacks, visibility)}</Badge>;
}
