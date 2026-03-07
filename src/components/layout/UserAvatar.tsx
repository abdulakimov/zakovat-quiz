"use client";

import * as React from "react";
import Image from "next/image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  imageUrl?: string | null;
  alt: string;
  fallback: string;
  className?: string;
  fallbackClassName?: string;
  sizes?: string;
  imageTestId?: string;
};

export function UserAvatar({
  imageUrl,
  alt,
  fallback,
  className,
  fallbackClassName,
  sizes = "40px",
  imageTestId,
}: UserAvatarProps) {
  const [hasError, setHasError] = React.useState(false);
  const canRenderImage = Boolean(imageUrl) && !hasError;

  React.useEffect(() => {
    setHasError(false);
  }, [imageUrl]);

  return (
    <Avatar className={className}>
      {canRenderImage ? (
        <Image
          src={imageUrl!}
          alt={alt}
          fill
          sizes={sizes}
          className="object-cover"
          onError={() => setHasError(true)}
          data-testid={imageTestId}
        />
      ) : null}
      {!canRenderImage ? <AvatarFallback className={cn(fallbackClassName)}>{fallback}</AvatarFallback> : null}
    </Avatar>
  );
}
