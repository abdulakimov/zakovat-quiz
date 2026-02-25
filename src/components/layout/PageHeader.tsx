"use client";

import type { ReactNode } from "react";
import { BackButton } from "@/src/components/layout/BackButton";
import { Breadcrumbs, type BreadcrumbItem } from "@/src/components/layout/Breadcrumbs";

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  breadcrumbs?: BreadcrumbItem[];
  onBack?: () => boolean;
  variant?: "default" | "compact";
  sticky?: boolean;
};

export function PageHeader({
  title,
  description,
  actions,
  backHref,
  breadcrumbs,
  onBack,
  variant = "default",
  sticky = false,
}: PageHeaderProps) {
  const isCompact = variant === "compact";
  return (
    <div
      className={[
        "flex flex-col border-b border-slate-200",
        isCompact ? "gap-2 pb-3" : "gap-3 pb-5",
        sticky ? "sticky top-0 z-30 -mx-4 bg-white/95 px-4 pt-2 backdrop-blur sm:-mx-6 sm:px-6" : "",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center gap-2">
        {backHref ? <BackButton href={backHref} onBeforeBack={onBack} /> : null}
        {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          {typeof title === "string" ? (
            <h1 className={isCompact ? "text-lg font-semibold text-slate-900" : "text-2xl font-semibold tracking-tight text-slate-900"}>
              {title}
            </h1>
          ) : (
            title
          )}
          {description
            ? typeof description === "string"
              ? <p className={isCompact ? "text-xs text-slate-600" : "text-sm leading-6 text-slate-600"}>{description}</p>
              : <div className={isCompact ? "text-xs text-slate-600" : "text-sm leading-6 text-slate-600"}>{description}</div>
            : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </div>
  );
}
