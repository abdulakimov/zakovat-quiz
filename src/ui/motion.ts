"use client";

import { useReducedMotion } from "framer-motion";

export const durations = {
  fast: 120,
  base: 180,
  slow: 240,
} as const;

export const easing = [0.16, 1, 0.3, 1] as const;

export const variants = {
  pageIn: {
    hidden: { opacity: 0, y: 6 },
    show: { opacity: 1, y: 0 },
  },
  cardIn: {
    hidden: { opacity: 0, y: 8, scale: 0.99 },
    show: { opacity: 1, y: 0, scale: 1 },
  },
  fade: {
    hidden: { opacity: 0 },
    show: { opacity: 1 },
  },
  listItem: {
    hidden: { opacity: 0, y: 6 },
    show: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6 },
  },
};

export function useShouldReduceMotion() {
  return useReducedMotion();
}

