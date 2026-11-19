import type { Database } from "bun:sqlite";
import { beforeEach, expect, test } from "bun:test";
import { HttpError } from "../../lib/http-errors";
import { hashPassword } from "../../lib/password";
import { detailsOf } from "../../test-support/details-of";
import { createTestDatabase } from "../../test-support/test-database";
import { findUser } from "./auth.repository";
import { changePassword, createUser, getAuthStatus, login, resetWithMasterKey } from "./auth.service";

const testKey = "24681357";
const testKeyHash = hashPassword(testKey);

let db: Database;

beforeEach(() => {
  db = createTestDatabase();
  createUser({ username: "ana", password: "clave1" }, db);
});

const reset = (master_key: string, username: string, password: string) =>
  resetWithMasterKey({ master_key, username, password }, db, testKeyHash);

test("cambia la contraseña y deja entrar con la nueva", () => {
  expect(changePassword({ current_password: "clave1", new_password: "clave2" }, db)).toBe("ana");
  expect(() => login({ username: "ana", password: "clave1" }, db)).toThrow(HttpError);
  expect(login({ username: "ana", password: "clave2" }, db).username).toBe("ana");
});

test("el cambio de contraseña rechaza la actual equivocada con 401", () => {
  expect(() => changePassword({ current_password: "mala", new_password: "clave2" }, db)).toThrow(
    expect.objectContaining({ status: 401 }) as unknown as Error,
  );
  expect(login({ username: "ana", password: "clave1" }, db).username).toBe("ana");
});

test("la contraseña nueva debe tener al menos 4 caracteres", () => {
  const details = detailsOf(() => changePassword({ current_password: "clave1", new_password: "ab" }, db));
  expect(details?.password).toBeDefined();
  expect(login({ username: "ana", password: "clave1" }, db).username).toBe("ana");
});

test("con la clave maestra correcta crea un usuario nuevo y cierra las sesiones viejas", () => {
  const old = login({ username: "ana", password: "clave1" }, db);
  const session = reset(testKey, "carlos", "nueva9");
  expect(session.username).toBe("carlos");
  expect(getAuthStatus(old.token, db).authenticated).toBe(false);
  expect(getAuthStatus(session.token, db).authenticated).toBe(true);
  expect(findUser(db)?.username).toBe("carlos");
  expect(login({ username: "carlos", password: "nueva9" }, db).username).toBe("carlos");
});

test("con la clave maestra equivocada no cambia nada", () => {
  expect(() => reset("11111111", "carlos", "nueva9")).toThrow(HttpError);
  expect(findUser(db)?.username).toBe("ana");
});

test("el reinicio valida el usuario y la contraseña nuevos", () => {
  expect(detailsOf(() => reset(testKey, "a b", "nueva9"))?.username).toBeDefined();
  expect(detailsOf(() => reset(testKey, "carlos", "ab"))?.password).toBeDefined();
  expect(findUser(db)?.username).toBe("ana");
});
