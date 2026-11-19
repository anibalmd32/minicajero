import { expect, test } from "bun:test";
import { detailsOf } from "../../test-support/details-of";
import { validatePassword, validateUsername } from "./credentials-validation";

test("el usuario debe ser una sola palabra, sin espacios", () => {
  expect(validateUsername("  ana  ")).toBe("ana");
  expect(detailsOf(() => validateUsername(""))?.username).toBeDefined();
  expect(detailsOf(() => validateUsername("   "))?.username).toBeDefined();
  expect(detailsOf(() => validateUsername("ana maria"))?.username).toContain("una sola palabra");
  expect(detailsOf(() => validateUsername("ana maria"))?.username).toContain("espacios");
  expect(detailsOf(() => validateUsername("a".repeat(41)))).toBeDefined();
});

test("la contraseña necesita al menos 4 caracteres", () => {
  expect(validatePassword("abcd")).toBe("abcd");
  expect(detailsOf(() => validatePassword("abc"))?.password).toContain("4");
  expect(detailsOf(() => validatePassword(""))?.password).toBeDefined();
  expect(detailsOf(() => validatePassword("a".repeat(65)))).toBeDefined();
});
