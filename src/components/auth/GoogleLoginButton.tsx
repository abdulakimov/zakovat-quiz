"use client";

import { Button } from "@/components/ui/button";
import { useTranslations } from "@/src/i18n/client";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.4c-.2 1.2-.8 2.2-1.7 2.9l2.8 2.2c1.6-1.5 2.5-3.8 2.5-6.4 0-.6-.1-1.2-.2-1.8H12z"
      />
      <path
        fill="#34A853"
        d="M6.8 14.3 6.2 16.4l-2 1.5C5.7 20.8 8.6 22 12 22c2.7 0 5-1 6.7-2.8l-2.8-2.2c-.8.6-2 1-3.9 1-3 0-5.5-2-6.4-4.7z"
      />
      <path
        fill="#4A90E2"
        d="M4.2 6.1C3.4 7.6 3 9.2 3 11s.4 3.4 1.2 4.9l2.6-2.1c-.2-.5-.3-1-.3-1.7s.1-1.2.3-1.7L4.2 6.1z"
      />
      <path
        fill="#FBBC05"
        d="M12 5c1.6 0 3 .6 4.1 1.6l3-3C17 1.6 14.7.5 12 .5 8.6.5 5.7 2.4 4.2 5.2l2.6 2.1C7.7 5.9 9.1 5 12 5z"
      />
    </svg>
  );
}

export function GoogleLoginButton() {
  const tAuth = useTranslations("auth");

  return (
    <Button asChild variant="outline" className="w-full">
      <a href="/auth/google/start" aria-label={tAuth("continueWithGoogle")} data-testid="google-login">
        <GoogleIcon />
        {tAuth("continueWithGoogle")}
      </a>
    </Button>
  );
}
