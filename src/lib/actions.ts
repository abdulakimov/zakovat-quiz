import { z } from "zod";

export type ActionResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

type AnySchema = z.ZodTypeAny;

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

export function safeAction<TSchema extends AnySchema, TOutput>(
  schema: TSchema,
  handler: (input: z.infer<TSchema>) => Promise<TOutput> | TOutput,
) {
  return async (rawInput: unknown): Promise<ActionResult<TOutput>> => {
    const parsed = schema.safeParse(rawInput);

    if (!parsed.success) {
      const flattened = parsed.error.flatten();
      const formErrors = flattened.formErrors.join(" ");
      return {
        ok: false,
        error: formErrors || "Invalid input.",
        fieldErrors: flattened.fieldErrors,
      };
    }

    try {
      const data = await handler(parsed.data);
      return { ok: true, data };
    } catch (error) {
      if (isRedirectError(error)) {
        throw error;
      }

      return {
        ok: false,
        error: error instanceof Error ? error.message : "Something went wrong.",
      };
    }
  };
}
