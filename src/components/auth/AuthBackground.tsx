"use client";

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

function OutlineShape({ shape }: { shape: Shape }) {
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
        className="absolute auth-bg-drift text-border/45"
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
      className={`absolute auth-bg-drift border border-border/45 ${shape.type === "circle" ? "rounded-full" : "rounded-md"}`}
      style={commonStyle}
      aria-hidden="true"
    />
  );
}

export function AuthBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" data-testid="auth-bg">
      <div className="auth-bg-float-slow absolute -left-20 top-8 h-72 w-72 rounded-full bg-primary/16 blur-3xl dark:bg-primary/26" />
      <div className="auth-bg-float-medium absolute right-[-90px] top-[18%] h-80 w-80 rounded-full bg-secondary/16 blur-3xl dark:bg-secondary/24" />
      <div className="auth-bg-float-fast absolute bottom-[-120px] left-[16%] h-[24rem] w-[24rem] rounded-full bg-primary/12 blur-3xl dark:bg-primary/20" />
      <div className="auth-bg-float-slow absolute bottom-[8%] right-[14%] h-64 w-64 rounded-full bg-secondary/14 blur-3xl dark:bg-secondary/22" />

      {shapes.map((shape, index) => (
        <OutlineShape key={`${shape.type}-${index}`} shape={shape} />
      ))}

      <div className="absolute inset-0 bg-background/45 dark:bg-background/58" />

      <style jsx global>{`
        @keyframes authBgFloat {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(0, -16px, 0) scale(1.03);
          }
        }
        @keyframes authBgDrift {
          0%,
          100% {
            transform: translate3d(0, 0, 0) rotate(0deg);
          }
          50% {
            transform: translate3d(7px, -10px, 0) rotate(5deg);
          }
        }
        .auth-bg-float-slow {
          animation: authBgFloat 32s ease-in-out infinite;
        }
        .auth-bg-float-medium {
          animation: authBgFloat 24s ease-in-out infinite;
        }
        .auth-bg-float-fast {
          animation: authBgFloat 18s ease-in-out infinite;
        }
        .auth-bg-drift {
          animation: authBgDrift 28s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .auth-bg-float-slow,
          .auth-bg-float-medium,
          .auth-bg-float-fast,
          .auth-bg-drift {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
