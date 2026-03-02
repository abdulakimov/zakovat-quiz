import assert from "node:assert/strict";
import { signInSchema } from "./auth";
import { zodResolverCompat } from "./rhf-zod";

export async function runRhfZodResolverTests() {
  const resolver = zodResolverCompat(signInSchema);

  const result = await resolver(
    {
      usernameOrEmail: "",
      password: "",
    },
    {},
    {
      criteriaMode: "firstError",
      names: [],
      fields: {},
      shouldUseNativeValidation: false,
    },
  );

  assert.equal(result.values && Object.keys(result.values).length > 0, false);
  assert.equal(result.errors.usernameOrEmail?.message, "auth.validation.identifier.required");
  assert.equal(result.errors.password?.message, "auth.validation.password.tooShort");
}
