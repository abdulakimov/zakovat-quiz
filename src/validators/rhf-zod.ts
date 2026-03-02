import type { FieldError, FieldErrors, FieldValues, Resolver } from "react-hook-form";
import { z } from "zod";

function toPath(path: PropertyKey[]) {
  return path.map(String).join(".");
}

function setNestedError(target: FieldErrors, path: string, error: FieldError) {
  const segments = path.split(".");
  let cursor: Record<string, unknown> = target;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const isLast = index === segments.length - 1;
    if (isLast) {
      cursor[segment] = error;
      return;
    }

    const existing = cursor[segment];
    if (!existing || typeof existing !== "object") {
      cursor[segment] = {};
    }
    cursor = cursor[segment] as Record<string, unknown>;
  }
}

function hasNestedError(target: FieldErrors, path: string) {
  const segments = path.split(".");
  let cursor: unknown = target;

  for (let index = 0; index < segments.length; index += 1) {
    if (!cursor || typeof cursor !== "object") {
      return false;
    }

    const segment = segments[index];
    const value = (cursor as Record<string, unknown>)[segment];
    const isLast = index === segments.length - 1;
    if (isLast) {
      return Boolean(value);
    }

    cursor = value;
  }

  return false;
}

export function zodResolverCompat<TValues extends FieldValues>(schema: z.ZodType<TValues>): Resolver<TValues> {
  return (async (values: TValues) => {
    const parsed = await schema.safeParseAsync(values);
    if (parsed.success) {
      return {
        values: parsed.data,
        errors: {},
      };
    }

    const errors: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const path = toPath(issue.path);
      if (!path || hasNestedError(errors, path)) {
        continue;
      }

      setNestedError(errors, path, {
        type: issue.code,
        message: issue.message,
      });
    }

    return {
      values: {} as TValues,
      errors,
    };
  }) as unknown as Resolver<TValues>;
}
