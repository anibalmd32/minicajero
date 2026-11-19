import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  DATA_DIR_ENV,
  isCompiledBinary,
  isWritableDir,
  type RuntimeContext,
  resolveDataDir,
  userDataDir,
} from "./data-dir";

const base: Omit<RuntimeContext, "main"> = {
  env: {},
  cwd: resolve("/proyecto"),
  execPath: resolve("/apps/lb/minicajero.exe"),
  platform: "win32",
  homeDir: "C:/Users/ana",
  isWritableDir: () => true,
};

test("usa la variable de entorno si está definida", () => {
  const dir = resolveDataDir({ ...base, main: "/x/index.ts", env: { [DATA_DIR_ENV]: "/datos" } });
  expect(dir).toBe(resolve("/datos"));
});

test("en desarrollo usa ./data del cwd", () => {
  expect(resolveDataDir({ ...base, main: "/proyecto/index.ts" })).toBe(resolve("/proyecto/data"));
});

test("en binario compilado usa data junto al ejecutable", () => {
  expect(resolveDataDir({ ...base, main: "B:/~BUN/root/index.js" })).toBe(resolve("/apps/lb/data"));
  expect(resolveDataDir({ ...base, main: "/$bunfs/root/index.js" })).toBe(resolve("/apps/lb/data"));
});

test("en binario compilado sin permiso de escritura usa la carpeta de datos del usuario", () => {
  const readOnly = { ...base, main: "B:/~BUN/root/index.js", isWritableDir: () => false };
  expect(resolveDataDir({ ...readOnly, env: { LOCALAPPDATA: "C:/Users/ana/AppData/Local" } })).toBe(
    join("C:/Users/ana/AppData/Local", "MiniCajero"),
  );
  expect(resolveDataDir(readOnly)).toBe(join("C:/Users/ana", "AppData", "Local", "MiniCajero"));
});

test("la variable de entorno tiene prioridad también en el binario", () => {
  const dir = resolveDataDir({ ...base, main: "B:/~BUN/root/index.js", env: { [DATA_DIR_ENV]: "/datos" } });
  expect(dir).toBe(resolve("/datos"));
});

test("carpeta de datos del usuario en macOS y Linux", () => {
  expect(userDataDir({ env: {}, platform: "darwin", homeDir: "/Users/ana" })).toBe(
    join("/Users/ana", "Library", "Application Support", "MiniCajero"),
  );
  expect(userDataDir({ env: {}, platform: "linux", homeDir: "/home/ana" })).toBe(
    join("/home/ana", ".local", "share", "MiniCajero"),
  );
  expect(userDataDir({ env: { XDG_DATA_HOME: "/xdg" }, platform: "linux", homeDir: "/home/ana" })).toBe(
    join("/xdg", "MiniCajero"),
  );
});

test("comprueba si una carpeta es escribible creándola si falta", () => {
  const dir = mkdtempSync(join(tmpdir(), "lb-escritura-"));
  try {
    expect(isWritableDir(join(dir, "nueva", "data"))).toBe(true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("detecta binario compilado", () => {
  expect(isCompiledBinary("B:\\~BUN\\root\\index.js")).toBe(true);
  expect(isCompiledBinary("D:\\repo\\app\\index.ts")).toBe(false);
});
