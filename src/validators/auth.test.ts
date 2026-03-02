import assert from "node:assert/strict";
import { signInSchema, signUpSchema } from "./auth";

export function runAuthSchemaTests() {
  const validSignIn = signInSchema.safeParse({
    usernameOrEmail: "User.Name",
    password: "abc12345",
  });
  assert.equal(validSignIn.success, true);
  if (validSignIn.success) {
    assert.equal(validSignIn.data.usernameOrEmail, "user.name");
  }

  const invalidEmail = signInSchema.safeParse({
    usernameOrEmail: "not-an-email@",
    password: "abc12345",
  });
  assert.equal(invalidEmail.success, false);
  if (!invalidEmail.success) {
    assert.equal(invalidEmail.error.issues[0]?.message, "auth.validation.email.invalid");
  }

  const trimmedEmail = signUpSchema.safeParse({
    name: "John Doe",
    username: "valid_user",
    email: "  USER@Example.COM ",
    password: "abc12345",
    confirmPassword: "abc12345",
  });
  assert.equal(trimmedEmail.success, true);
  if (trimmedEmail.success) {
    assert.equal(trimmedEmail.data.email, "user@example.com");
  }

  const shortPassword = signInSchema.safeParse({
    usernameOrEmail: "user@example.com",
    password: "abc1234",
  });
  assert.equal(shortPassword.success, false);
  if (!shortPassword.success) {
    assert.equal(shortPassword.error.issues[0]?.message, "auth.validation.password.tooShort");
  }

  const longPassword = signInSchema.safeParse({
    usernameOrEmail: "user@example.com",
    password: `a${"1".repeat(72)}`,
  });
  assert.equal(longPassword.success, false);
  if (!longPassword.success) {
    assert.equal(longPassword.error.issues[0]?.message, "auth.validation.password.tooLong");
  }

  const missingLetter = signInSchema.safeParse({
    usernameOrEmail: "user@example.com",
    password: "12345678",
  });
  assert.equal(missingLetter.success, false);
  if (!missingLetter.success) {
    assert.equal(missingLetter.error.issues[0]?.message, "auth.validation.password.missingLetter");
  }

  const missingNumber = signInSchema.safeParse({
    usernameOrEmail: "user@example.com",
    password: "abcdefgh",
  });
  assert.equal(missingNumber.success, false);
  if (!missingNumber.success) {
    assert.equal(missingNumber.error.issues[0]?.message, "auth.validation.password.missingNumber");
  }

  const mismatchConfirmPassword = signUpSchema.safeParse({
    name: "John Doe",
    username: "valid_user",
    email: "john@example.com",
    password: "abc12345",
    confirmPassword: "abc12346",
  });
  assert.equal(mismatchConfirmPassword.success, false);
  if (!mismatchConfirmPassword.success) {
    assert.equal(mismatchConfirmPassword.error.issues[0]?.path[0], "confirmPassword");
    assert.equal(mismatchConfirmPassword.error.issues[0]?.message, "auth.validation.confirmPassword.mismatch");
  }

  const invalidUsernamePattern = signUpSchema.safeParse({
    name: "John Doe",
    username: "__invalid",
    email: "john@example.com",
    password: "abc12345",
    confirmPassword: "abc12345",
  });
  assert.equal(invalidUsernamePattern.success, false);
  if (!invalidUsernamePattern.success) {
    assert.equal(invalidUsernamePattern.error.issues[0]?.message, "auth.validation.username.invalidEdge");
  }

  const normalizedUsername = signUpSchema.safeParse({
    name: "John Doe",
    username: "Valid_User",
    email: "john@example.com",
    password: "abc12345",
    confirmPassword: "abc12345",
  });
  assert.equal(normalizedUsername.success, true);
  if (normalizedUsername.success) {
    assert.equal(normalizedUsername.data.username, "valid_user");
  }
}
