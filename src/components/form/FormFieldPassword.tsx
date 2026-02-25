"use client";

import type { FieldError, FieldValues, Path, UseFormRegister } from "react-hook-form";
import { FormFieldText } from "@/src/components/form/FormFieldText";

type FormFieldPasswordProps<TFieldValues extends FieldValues> = {
  id: string;
  name: Path<TFieldValues>;
  label: string;
  register: UseFormRegister<TFieldValues>;
  error?: FieldError;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "id" | "name">;

export function FormFieldPassword<TFieldValues extends FieldValues>(
  { type = "password", ...props }: FormFieldPasswordProps<TFieldValues>,
) {
  return <FormFieldText {...props} type={type} />;
}
