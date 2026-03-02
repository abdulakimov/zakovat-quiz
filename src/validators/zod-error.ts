import { z } from "zod";

export type FieldErrorMap = Record<string, string>;

export function formatZodError(error: z.ZodError): FieldErrorMap {
  const fieldErrors: FieldErrorMap = {};

  for (const issue of error.issues) {
    const path = issue.path[0];
    if (typeof path !== "string") {
      continue;
    }

    if (!(path in fieldErrors)) {
      fieldErrors[path] = issue.message;
    }
  }

  return fieldErrors;
}
