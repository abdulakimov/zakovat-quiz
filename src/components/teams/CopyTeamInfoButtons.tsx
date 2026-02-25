"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/src/components/ui/sonner";

type Props = {
  teamId: string;
  teamPath: string;
};

async function copyText(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Failed to copy ${label.toLowerCase()}`);
  }
}

export function CopyTeamInfoButtons({ teamId, teamPath }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" variant="outline" onClick={() => void copyText("Team ID", teamId)}>
        Copy team ID
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={() => void copyText("Share link", teamPath)}>
        Copy share link
      </Button>
    </div>
  );
}
