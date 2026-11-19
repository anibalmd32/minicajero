import { afterEach, beforeEach, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFileLog, logFilePath } from "./file-logger";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "lb-desktop-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

test("escribe líneas con fecha y nivel creando la carpeta", () => {
  const path = logFilePath(dir);
  const log = createFileLog({ path, now: () => new Date("2026-01-02T03:04:05.000Z") });
  log.write("INFO", "arranque");
  log.write("ERROR", "fallo");
  expect(readFileSync(path, "utf8")).toBe(
    "2026-01-02T03:04:05.000Z INFO  arranque\n2026-01-02T03:04:05.000Z ERROR fallo\n",
  );
});

test("rota al superar el tamaño y conserva solo las copias indicadas", () => {
  const path = join(dir, "app.log");
  const log = createFileLog({ path, maxBytes: 60, backups: 2 });
  for (let index = 1; index <= 8; index++) log.write("INFO", `mensaje ${index}`);
  expect(existsSync(`${path}.1`)).toBe(true);
  expect(existsSync(`${path}.2`)).toBe(true);
  expect(existsSync(`${path}.3`)).toBe(false);
  expect(readFileSync(path, "utf8")).toContain("mensaje 8");
  expect(readFileSync(path, "utf8")).not.toContain("mensaje 1\n");
});
