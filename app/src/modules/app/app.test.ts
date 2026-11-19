import { expect, test } from "bun:test";
import { APP_VERSION } from "../../lib/version";
import { reopenInstructions } from "../../resources/ui/app-info";
import { getAppInfoHandler } from "./app.controller";
import { configureAppRuntime } from "./app.service";

test("devuelve versión, rutas y nombre del ejecutable", async () => {
  configureAppRuntime({
    dataDir: "C:/Apps/MiniCajero/data",
    databasePath: "C:/Apps/MiniCajero/data/minicajero.db",
    logPath: "C:/Apps/MiniCajero/data/logs/minicajero.log",
    port: 4000,
    desktop: true,
    executablePath: "C:/Apps/MiniCajero/minicajero.exe",
  });
  const body = await getAppInfoHandler().json();
  expect(body).toEqual({
    name: "MiniCajero",
    version: APP_VERSION,
    desktop: true,
    executable: "minicajero.exe",
    dataDir: "C:/Apps/MiniCajero/data",
    databasePath: "C:/Apps/MiniCajero/data/minicajero.db",
    logPath: "C:/Apps/MiniCajero/data/logs/minicajero.log",
    port: 4000,
  });
});

test("instrucciones para volver a abrir", () => {
  expect(reopenInstructions({ desktop: true, executable: "minicajero.exe" })).toContain("minicajero.exe");
  expect(reopenInstructions({ desktop: false, executable: null })).toContain("bun run start");
});
