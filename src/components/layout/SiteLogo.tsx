import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type SiteLogoProps = {
  href: string;
  ariaLabel: string;
  name?: string;
  subtitle?: string;
  className?: string;
};

export function SiteLogo({
  href,
  ariaLabel,
  name,
  subtitle,
  className,
}: SiteLogoProps) {
  return (
    <Link href={href} aria-label={ariaLabel} className={cn("inline-flex items-center gap-2 rounded-md px-1 py-1", className)}>
      <Image
        src="/icon.png"
        alt=""
        width={32}
        height={32}
        priority
        className="h-8 w-8 rounded-lg border border-border/60 object-cover"
      />
      {name ? (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold tracking-tight text-foreground">{name}</span>
          {subtitle ? <span className="hidden text-xs text-muted-foreground sm:block">{subtitle}</span> : null}
        </span>
      ) : null}
    </Link>
  );
}
