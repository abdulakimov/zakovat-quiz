type GoogleIconProps = {
  className?: string;
};

export function GoogleIcon({ className = "h-5 w-5" }: GoogleIconProps) {
  return (
    <svg data-icon="google" aria-hidden="true" viewBox="0 0 24 24" className={className}>
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.74-.07-1.45-.2-2.13H12v4.03h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.98-4.32 2.98-7.42Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.61-2.35l-3.24-2.5c-.9.6-2.04.96-3.37.96-2.59 0-4.79-1.75-5.58-4.1H3.08v2.57A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.42 14.01a5.98 5.98 0 0 1 0-3.82V7.62H3.08a10 10 0 0 0 0 8.96l3.34-2.57Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.89c1.47 0 2.79.5 3.82 1.49l2.86-2.86A9.96 9.96 0 0 0 12 2a10 10 0 0 0-8.92 5.62l3.34 2.57c.79-2.35 2.99-4.3 5.58-4.3Z"
      />
    </svg>
  );
}
