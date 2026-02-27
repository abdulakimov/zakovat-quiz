"use client";

import type { FieldError, FieldValues, Path, UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormFieldTextProps<TFieldValues extends FieldValues> = {
  id: string;
  name: Path<TFieldValues>;
  label: string;
  register: UseFormRegister<TFieldValues>;
  error?: FieldError;
  type?: React.InputHTMLAttributes<HTMLInputElement>["type"];
  className?: string;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "id" | "name" | "type" | "className"
>;

export function FormFieldText<TFieldValues extends FieldValues>({
  id,
  name,
  label,
  register,
  error,
  type = "text",
  className,
  ...inputProps
}: FormFieldTextProps<TFieldValues>) {
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? errorId : undefined}
        className={cn("h-10", error ? "border-red-300 focus-visible:ring-red-300" : "", className)}
        {...register(name)}
        {...inputProps}
      />
      {error ? (
        <p id={errorId} className="text-xs text-red-600" role="alert">
          {error.message}
        </p>
      ) : null}
    </div>
  );
}
