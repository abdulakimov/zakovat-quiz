"use client";

import * as React from "react";
import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (!items?.length) return null;
  const lastIndex = items.length - 1;
  const first = items[0];
  const last = items[lastIndex];
  const middle = items.slice(1, lastIndex);

  const renderItem = (item: BreadcrumbItem, isCurrent = false) =>
    item.href && !isCurrent ? (
      <Link
        href={item.href}
        className="max-w-[160px] truncate text-muted-foreground hover:text-foreground"
        title={item.label}
      >
        {item.label}
      </Link>
    ) : (
      <span className="max-w-[160px] truncate text-muted-foreground" title={item.label}>
        {item.label}
      </span>
    );

  return (
    <nav aria-label="Breadcrumbs">
      <ol className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <li>{renderItem(first)}</li>
        {items.length > 1 ? (
          <>
            <li className="text-muted-foreground/70">/</li>
            {middle.length > 0 ? (
              <>
                <li className="sm:hidden">…</li>
                <li className="hidden sm:flex items-center gap-2">
                  {middle.map((item, index) => (
                    <React.Fragment key={`${item.label}-${index}`}>
                      {renderItem(item)}
                      <span className="text-muted-foreground/70">/</span>
                    </React.Fragment>
                  ))}
                </li>
                <li className="text-muted-foreground/70 sm:hidden">/</li>
              </>
            ) : null}
            <li>{renderItem(last, true)}</li>
          </>
        ) : null}
      </ol>
    </nav>
  );
}
