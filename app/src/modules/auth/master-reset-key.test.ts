import { expect, test } from "bun:test";
import { hashPassword } from "../../lib/password";
import { isMasterResetKey, MASTER_RESET_KEY_HASH } from "./master-reset-key";

const testKey = "24681357";
const testKeyHash = hashPassword(testKey);

test("la clave maestra solo admite los números correctos", () => {
  expect(isMasterResetKey(testKey, testKeyHash)).toBe(true);
  expect(isMasterResetKey(` ${testKey} `, testKeyHash)).toBe(true);
  expect(isMasterResetKey("00000000", testKeyHash)).toBe(false);
  expect(isMasterResetKey("2468135", testKeyHash)).toBe(false);
  expect(isMasterResetKey("246813579", testKeyHash)).toBe(false);
  expect(isMasterResetKey("abcdefgh", testKeyHash)).toBe(false);
  expect(isMasterResetKey(24681357, testKeyHash)).toBe(false);
});

test("sin hash configurado ninguna clave maestra es válida", () => {
  const notConfigured = { hash: "", salt: "" };
  expect(isMasterResetKey(testKey, notConfigured)).toBe(false);
  expect(isMasterResetKey("", notConfigured)).toBe(false);
});

test("el hash configurado viene del entorno y nunca es la clave en claro", () => {
  expect(MASTER_RESET_KEY_HASH.hash).toMatch(/^([0-9a-f]{64})?$/);
  expect(MASTER_RESET_KEY_HASH.salt).toMatch(/^([0-9a-f]{32})?$/);
  expect(isMasterResetKey(testKey)).toBe(false);
});
