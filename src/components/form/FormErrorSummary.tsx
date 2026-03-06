"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";

type FormErrorSummaryProps = {
  serverError?: string | null;
  errors?: Array<string | undefined>;
};

export function FormErrorSummary({ serverError, errors = [] }: FormErrorSummaryProps) {
  const messages = Array.from(
    new Set(
      [serverError, ...errors]
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .map((value) => value.trim()),
    ),
  );

  if (messages.length === 0) return null;

  return (
    <Alert variant="destructive">
      {messages.length === 1 ? (
        <AlertDescription>{messages[0]}</AlertDescription>
      ) : (
        <ul className="list-disc space-y-1 pl-4 text-sm">
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </Alert>
  );
}
