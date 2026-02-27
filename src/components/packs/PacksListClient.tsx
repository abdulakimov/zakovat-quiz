"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CreatePackDialog } from "@/src/components/packs/CreatePackDialog";
import { PackVisibilityBadge } from "@/src/components/packs/PackVisibilityBadge";
import { localizeHref, normalizeLocale } from "@/src/i18n/config";
import { useTranslations } from "@/src/i18n/client";
import { BoxIcon } from "@/src/ui/icons";
import { getFeatureAccent } from "@/src/lib/featureAccent";

type PackListItem = {
  id: string;
  title: string;
  description: string | null;
  visibility: "DRAFT" | "PRIVATE" | "PUBLIC";
  updatedAtLabel: string;
  roundsCount: number;
};

export function PacksListClient({ packs }: { packs: PackListItem[] }) {
  const tPacks = useTranslations("packs");
  const locale = normalizeLocale(useLocale());
  const [query, setQuery] = React.useState("");
  const accent = getFeatureAccent("packs");
  const normalized = query.trim().toLowerCase();
  const filtered = packs.filter((pack) => {
    if (!normalized) return true;
    return (
      pack.title.toLowerCase().includes(normalized) ||
      (pack.description ?? "").toLowerCase().includes(normalized)
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tPacks("searchPlaceholder")}
          className="sm:max-w-sm"
        />
        <CreatePackDialog />
      </div>

      {packs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <div className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${accent.background} ${accent.icon}`}>
              <BoxIcon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">{tPacks("empty.title")}</p>
              <p className="text-sm text-muted-foreground">{tPacks("empty.description")}</p>
            </div>
            <CreatePackDialog />
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <div className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${accent.background} ${accent.icon}`}>
              <BoxIcon className="h-4 w-4" />
            </div>
            <p className="text-sm text-muted-foreground">{tPacks("searchEmpty")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((pack) => (
            <Link key={pack.id} href={localizeHref(locale, `/app/packs/${pack.id}`)} className="block">
              <Card className="h-full transition hover:border-border/80" data-testid="packs-card">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${accent.background} ${accent.icon}`}>
                        <BoxIcon className="h-4 w-4" />
                      </div>
                      <p className="line-clamp-2 text-base font-semibold text-foreground">{pack.title}</p>
                    </div>
                    <PackVisibilityBadge visibility={pack.visibility} />
                  </div>
                  {pack.description ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{pack.description}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground/70">{tPacks("noDescription")}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{tPacks("roundsCount", { count: pack.roundsCount })}</span>
                    <span>{tPacks("updatedAt", { date: pack.updatedAtLabel })}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
