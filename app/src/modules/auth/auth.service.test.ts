import type { Database } from "bun:sqlite";
import { beforeEach, expect, test } from "bun:test";
import { HttpError } from "../../lib/http-errors";
import { createTestDatabase } from "../../test-support/test-database";
import { findUser } from "./auth.repository";
import { createUser, getAuthStatus, login, logout } from "./auth.service";

let db: Database;

beforeEach(() => {
  db = createTestDatabase();
});

const createAna = () => createUser({ username: "ana", password: "clave1" }, db);

test("la primera vez crea el usuario y abre sesión", () => {
  expect(getAuthStatus(null, db)).toEqual({ needsSetup: true, authenticated: false, username: null });
  const session = createAna();
  expect(session.username).toBe("ana");
  expect(session.token.length).toBeGreaterThan(20);
  expect(getAuthStatus(session.token, db)).toEqual({ needsSetup: false, authenticated: true, username: "ana" });
});

test("no se puede crear un segundo usuario sin la clave maestra", () => {
  createAna();
  expect(() => createUser({ username: "otro", password: "clave2" }, db)).toThrow(/Ya existe un usuario/);
});

test("la contraseña guardada no es el texto plano", () => {
  createAna();
  const stored = findUser(db);
  expect(stored?.password_hash).not.toBe("clave1");
  expect(stored?.password_salt.length).toBeGreaterThan(10);
  expect(stored?.password_hash).not.toContain("clave1");
});

test("el inicio de sesión acepta el usuario correcto sin distinguir mayúsculas", () => {
  createAna();
  expect(login({ username: "ANA", password: "clave1" }, db).username).toBe("ana");
});

test("el inicio de sesión rechaza la contraseña equivocada con 401", () => {
  createAna();
  expect(() => login({ username: "ana", password: "mala" }, db)).toThrow(
    expect.objectContaining({ status: 401 }) as unknown as Error,
  );
});

test("el inicio de sesión rechaza un usuario que no existe", () => {
  createAna();
  expect(() => login({ username: "otro", password: "clave1" }, db)).toThrow(HttpError);
});

test("cerrar sesión invalida el token", () => {
  createAna();
  const session = login({ username: "ana", password: "clave1" }, db);
  expect(getAuthStatus(session.token, db).authenticated).toBe(true);
  logout(session.token, db);
  expect(getAuthStatus(session.token, db).authenticated).toBe(false);
});

test("un token inventado no da acceso", () => {
  createAna();
  expect(getAuthStatus("token-inventado", db).authenticated).toBe(false);
});
