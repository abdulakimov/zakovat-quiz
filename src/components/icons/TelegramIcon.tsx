type TelegramIconProps = {
  className?: string;
};

export function TelegramIcon({ className = "h-5 w-5" }: TelegramIconProps) {
  return (
    <svg
      data-icon="telegram"
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
    >
      <path
        fill="#229ED9"
        d="M9.04 15.77 8.66 21c.54 0 .77-.23 1.05-.51l2.52-2.41 5.22 3.82c.96.53 1.64.25 1.9-.88l3.43-16.08c.31-1.45-.52-2.02-1.45-1.67L1.31 11.01c-1.38.54-1.36 1.31-.24 1.66l5.13 1.61 11.92-7.52c.56-.35 1.08-.16.66.2"
      />
    </svg>
  );
}
