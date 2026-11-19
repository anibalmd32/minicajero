import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sleep } from "./sleep";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter((path): path is string => Boolean(path));

/** Chrome en marcha: puerto de depuración y cierre (mata el proceso y borra el perfil temporal). */
export interface LaunchedChrome {
  port: number;
  close(): Promise<void>;
}

async function readDebuggerPort(profileDir: string): Promise<number> {
  const portFile = join(profileDir, "DevToolsActivePort");
  for (let attempt = 0; attempt < 100; attempt++) {
    if (existsSync(portFile)) {
      const port = Number(readFileSync(portFile, "utf8").split("\n")[0]);
      if (port) return port;
    }
    await sleep(100);
  }
  throw new Error("Chrome no abrió el puerto de depuración");
}

function chromeArguments(profileDir: string, ignoreCertificateErrors: boolean): string[] {
  return [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--remote-debugging-port=0",
    `--user-data-dir=${profileDir}`,
    ...(ignoreCertificateErrors ? ["--ignore-certificate-errors"] : []),
    "about:blank",
  ];
}

/** Lanza Chrome/Edge headless con un perfil temporal. */
export async function launchChrome(ignoreCertificateErrors: boolean): Promise<LaunchedChrome> {
  const chromePath = CHROME_CANDIDATES.find((path) => existsSync(path));
  if (!chromePath) throw new Error("No se encontró Chrome/Edge. Define CHROME_PATH.");
  const profileDir = mkdtempSync(join(tmpdir(), "minicajero-chrome-"));
  const chrome = Bun.spawn([chromePath, ...chromeArguments(profileDir, ignoreCertificateErrors)], {
    stdout: "ignore",
    stderr: "ignore",
  });
  const close = async () => {
    chrome.kill();
    await chrome.exited;
    await sleep(300);
    rmSync(profileDir, { recursive: true, force: true });
  };
  try {
    return { port: await readDebuggerPort(profileDir), close };
  } catch (error) {
    await close();
    throw error;
  }
}
