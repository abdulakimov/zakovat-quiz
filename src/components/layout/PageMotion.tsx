"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { durations, easing, useShouldReduceMotion, variants } from "@/src/ui/motion";

export function PageMotion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useShouldReduceMotion();
  const isPresenter = pathname.includes("/app/presenter");

  if (isPresenter) {
    return <div>{children}</div>;
  }

  return (
    <motion.div
      key={pathname}
      initial="hidden"
      animate="show"
      variants={variants.pageIn}
      transition={{ duration: reduceMotion ? 0 : durations.base / 1000, ease: easing }}
    >
      {children}
    </motion.div>
  );
}

