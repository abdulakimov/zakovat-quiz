"use client";

import { useEffect, useState } from "react";

type ShapeType = "circle" | "square" | "triangle";

type Shape = {
  top: string;
  left: string;
  size: string;
  type: ShapeType;
  delay: string;
  duration: string;
};

const shapes: Shape[] = [
  { top: "8%", left: "10%", size: "34px", type: "circle", delay: "0s", duration: "21s" },
  { top: "14%", left: "72%", size: "30px", type: "square", delay: "1s", duration: "24s" },
  { top: "22%", left: "40%", size: "40px", type: "triangle", delay: "0.5s", duration: "28s" },
  { top: "46%", left: "84%", size: "28px", type: "circle", delay: "2s", duration: "20s" },
  { top: "60%", left: "16%", size: "26px", type: "square", delay: "1.5s", duration: "25s" },
  { top: "74%", left: "64%", size: "34px", type: "triangle", delay: "0.8s", duration: "27s" },
  { top: "82%", left: "30%", size: "30px", type: "circle", delay: "1.2s", duration: "23s" },
  { top: "36%", left: "56%", size: "24px", type: "square", delay: "2.2s", duration: "19s" },
];

function OutlineShape({ shape, reducedMotion }: { shape: Shape; reducedMotion: boolean }) {
  const commonStyle = {
    top: shape.top,
    left: shape.left,
    width: shape.size,
    height: shape.size,
    animationDelay: shape.delay,
    animationDuration: shape.duration,
  };

  if (shape.type === "triangle") {
    return (
      <svg
        className={`absolute text-border/35 ${reducedMotion ? "" : "auth-drift"} motion-reduce:animate-none`}
        style={commonStyle}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <polygon points="12,3 21,20 3,20" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    );
  }

  return (
    <span
      className={`absolute border border-border/40 motion-reduce:animate-none ${
        reducedMotion ? "" : "auth-drift"
      } ${
        shape.type === "circle" ? "rounded-full" : "rounded-md"
      }`}
      style={commonStyle}
      aria-hidden="true"
    />
  );
}

export function AuthBackground() {
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" data-testid="auth-background">
      <div
        className={`absolute -left-16 top-12 h-72 w-72 rounded-full bg-primary/12 blur-3xl motion-reduce:animate-none ${
          reducedMotion ? "" : "auth-float-slow"
        }`}
      />
      <div
        className={`absolute right-[-80px] top-[22%] h-80 w-80 rounded-full bg-secondary/12 blur-3xl motion-reduce:animate-none ${
          reducedMotion ? "" : "auth-float-medium"
        }`}
      />
      <div
        className={`absolute bottom-[-90px] left-[18%] h-96 w-96 rounded-full bg-primary/8 blur-3xl motion-reduce:animate-none ${
          reducedMotion ? "" : "auth-float-fast"
        }`}
      />
      <div
        className={`absolute bottom-[14%] right-[18%] h-64 w-64 rounded-full bg-secondary/10 blur-3xl motion-reduce:animate-none ${
          reducedMotion ? "" : "auth-float-slow"
        }`}
      />

      {shapes.map((shape, index) => (
        <OutlineShape key={`${shape.type}-${index}`} shape={shape} reducedMotion={reducedMotion} />
      ))}

      <div className="absolute inset-0 bg-background/60" />
    </div>
  );
}
