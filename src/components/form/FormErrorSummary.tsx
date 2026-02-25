"use client";

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
    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {messages.length === 1 ? (
        <p>{messages[0]}</p>
      ) : (
        <ul className="list-disc space-y-1 pl-4">
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
