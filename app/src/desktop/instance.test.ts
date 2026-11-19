import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { APP_ID } from "../lib/version";
import { isMiniCajeroRunning, isPortInUse, localUrl, portFilePath, readSavedPort, savePort } from "./instance";
import { launch, NoFreePortError } from "./launcher";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "lb-desktop-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function fakeFetch(response: Response | Error): typeof fetch {
  return (async () => {
    if (response instanceof Error) throw response;
    return response;
  }) as unknown as typeof fetch;
}

function serveOn(hostname: string, body: unknown) {
  return Bun.serve({ hostname, port: 0, fetch: () => Response.json(body) });
}

async function freePort(): Promise<number> {
  const probe = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response() });
  const port = probe.port as number;
  await probe.stop(true);
  return port;
}

test("guarda y lee el puerto elegido", () => {
  const path = portFilePath(join(dir, "datos"));
  expect(readSavedPort(path)).toBeNull();
  savePort(path, 4003);
  expect(readSavedPort(path)).toBe(4003);
});

test("ignora contenidos inválidos del archivo de puerto", () => {
  const path = portFilePath(dir);
  for (const text of ["", "abc", "0", "70000", "40.5", "-1"]) {
    writeFileSync(path, text);
    expect(readSavedPort(path)).toBeNull();
  }
});

test("URL local", () => {
  expect(localUrl(4005)).toBe("http://localhost:4005/");
});

test("reconoce la aplicación por su identificador", async () => {
  expect(await isMiniCajeroRunning(4000, fakeFetch(Response.json({ status: "ok", app: APP_ID })))).toBe(true);
});

test("otro programa o ninguna respuesta no cuentan como instancia", async () => {
  expect(await isMiniCajeroRunning(4000, fakeFetch(Response.json({ status: "ok" })))).toBe(false);
  expect(await isMiniCajeroRunning(4000, fakeFetch(new Response("<html></html>")))).toBe(false);
  expect(await isMiniCajeroRunning(4000, fakeFetch(Response.json({ app: APP_ID }, { status: 500 })))).toBe(false);
  expect(await isMiniCajeroRunning(4000, fakeFetch(new Error("ECONNREFUSED")))).toBe(false);
});

test("otro programa en 127.0.0.1 ocupa el puerto y no cuenta como instancia", async () => {
  const other = serveOn("127.0.0.1", { app: "otro" });
  try {
    const port = other.port as number;
    expect(await isPortInUse(port)).toBe(true);
    expect(await isMiniCajeroRunning(port)).toBe(false);
    const result = launch({
      preferredPort: port,
      searchSize: 1,
      isRunning: (candidate) => isMiniCajeroRunning(candidate),
      isPortInUse,
      listen: () => "no debería escuchar",
    });
    await expect(result).rejects.toBeInstanceOf(NoFreePortError);
  } finally {
    await other.stop(true);
  }
});

test("reconoce la instancia que solo responde por IPv6", async () => {
  const instance = serveOn("::1", { status: "ok", app: APP_ID });
  try {
    const port = instance.port as number;
    expect(await isPortInUse(port)).toBe(true);
    expect(await isMiniCajeroRunning(port)).toBe(true);
  } finally {
    await instance.stop(true);
  }
});

test("un puerto sin nadie escuchando está libre", async () => {
  expect(await isPortInUse(await freePort())).toBe(false);
});
