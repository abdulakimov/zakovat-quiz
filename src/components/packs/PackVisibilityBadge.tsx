import { Badge } from "@/components/ui/badge";

export function PackVisibilityBadge({ visibility }: { visibility: "DRAFT" | "PRIVATE" | "PUBLIC" }) {
  if (visibility === "PUBLIC") return <Badge variant="success">Public</Badge>;
  if (visibility === "PRIVATE") return <Badge variant="secondary">Private</Badge>;
  return <Badge>DRAFT</Badge>;
}
