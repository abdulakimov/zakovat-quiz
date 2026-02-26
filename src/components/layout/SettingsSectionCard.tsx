"use client";

import * as React from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { durations, easing, useShouldReduceMotion, variants } from "@/src/ui/motion";

export function SettingsSectionGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useShouldReduceMotion();
  return (
    <motion.div
      className={cn("space-y-4", className)}
      initial="hidden"
      animate="show"
      variants={{
        show: {
          transition: {
            staggerChildren: reduceMotion ? 0 : 0.06,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function SettingsSectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
  footer,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useShouldReduceMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : "hidden"}
      animate="show"
      variants={variants.cardIn}
      transition={{ duration: reduceMotion ? 0 : durations.base / 1000, ease: easing }}
    >
      <Card className={cn("border-slate-200", className)}>
        <CardHeader className="flex flex-row items-start gap-3 pb-3">
          <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            <Icon className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-slate-900">{title}</p>
            {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
        {footer ? <CardFooter className="pt-0">{footer}</CardFooter> : null}
      </Card>
    </motion.div>
  );
}
