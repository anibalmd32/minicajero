import { closeDatabase, initDatabase } from "./src/db/connection";
import { isCompiledBinary, resolveDataDir } from "./src/db/data-dir";
import { openBrowser } from "./src/desktop/browser";
import { createFileLog, logFilePath, redirectConsoleToLog } from "./src/desktop/file-logger";
import {
  isMiniCajeroRunning,
  isPortInUse,
  localUrl,
  portFilePath,
  readSavedPort,
  savePort,
} from "./src/desktop/instance";
import { launch, PORT_SEARCH_SIZE } from "./src/desktop/launcher";
import { DEFAULT_PORT, readPort } from "./src/lib/env";
import { APP_NAME, APP_VERSION } from "./src/lib/version";
import { configureAppRuntime, onShutdownRequested } from "./src/modules/app/app.service";
import { startBackupScheduler } from "./src/modules/backup/backup.scheduler";
import { startRateSyncScheduler } from "./src/modules/exchange-rates/exchange-rates.scheduler";
import { configurePhoneScanner } from "./src/modules/phone/phone.service";
import { type AppServer, startServer } from "./src/server";

const desktop = isCompiledBinary();
const dataDir = resolveDataDir();
const logPath = desktop ? logFilePath(dataDir) : null;
const shouldOpenBrowser = process.env.OPEN_BROWSER === "1" || (desktop && process.env.OPEN_BROWSER !== "0");

function exitWithError(context: string, err: unknown): never {
  console.error(`${context}:`, err);
  process.exit(1);
}

function setUpDesktopLogging(path: string): void {
  redirectConsoleToLog(createFileLog({ path }));
  process.on("uncaughtException", (err) => exitWithError("Error no controlado", err));
  process.on("unhandledRejection", (reason) => console.error("Promesa rechazada sin manejar:", reason));
}

function preferredPort(portFile: string): number {
  if (process.env.PORT?.trim()) return readPort();
  return (desktop ? readSavedPort(portFile) : null) ?? DEFAULT_PORT;
}

function rememberPort(portFile: string, port: number): void {
  if (!desktop || readSavedPort(portFile) === port) return;
  try {
    savePort(portFile, port);
  } catch (err) {
    console.error(`No se pudo guardar el puerto en ${portFile}:`, err);
  }
}

function listen(port: number): AppServer {
  initDatabase(dataDir);
  return startServer(port);
}

function logStartup(database: ReturnType<typeof initDatabase>, server: AppServer): void {
  const { applied, currentVersion } = database.migrations;
  const migrationSummary = applied.length > 0 ? `aplicadas ${applied.join(", ")}` : "sin cambios";
  console.log(`${APP_NAME} ${APP_VERSION}${desktop ? " (escritorio)" : ""}`);
  console.log(`Base de datos: ${database.path} (esquema v${currentVersion}, migraciones ${migrationSummary})`);
  console.log(`MiniCajero escuchando en ${server.url}`);
}

function runServer(server: AppServer, port: number): void {
  const database = initDatabase(dataDir);
  const phoneScanner = configurePhoneScanner({ dataDir, appPort: port });
  const stopRateSync = startRateSyncScheduler();
  const stopBackups = startBackupScheduler({ dataDir });

  const shutdown = (): void => {
    console.log("Cerrando MiniCajero…");
    stopRateSync();
    stopBackups();
    phoneScanner.shutdown();
    void server.stop(true);
    closeDatabase();
    process.exit(0);
  };
  onShutdownRequested(shutdown);
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  configureAppRuntime({
    dataDir,
    databasePath: database.path,
    logPath,
    port,
    desktop,
    executablePath: desktop ? process.execPath : null,
  });

  logStartup(database, server);
}

async function main(): Promise<void> {
  if (logPath) setUpDesktopLogging(logPath);
  const portFile = portFilePath(dataDir);
  const result = await launch({
    preferredPort: preferredPort(portFile),
    searchSize: desktop ? PORT_SEARCH_SIZE : 1,
    isRunning: (port) => (desktop ? isMiniCajeroRunning(port) : Promise.resolve(false)),
    isPortInUse: (port) => (desktop ? isPortInUse(port) : Promise.resolve(false)),
    listen,
    onPortBusy: (port) => console.warn(`El puerto ${port} está ocupado por otro programa.`),
  });

  const url = localUrl(result.port);
  if (result.kind === "existing") {
    console.log(`MiniCajero ya está abierto en ${url}`);
    rememberPort(portFile, result.port);
    if (shouldOpenBrowser) openBrowser(url);
    process.exit(0);
  }

  rememberPort(portFile, result.port);
  runServer(result.server, result.port);
  if (shouldOpenBrowser) openBrowser(url);
}

await main().catch((err) => exitWithError("No se pudo iniciar MiniCajero", err));
