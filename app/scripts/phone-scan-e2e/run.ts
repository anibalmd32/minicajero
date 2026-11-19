import { join } from "node:path";
import { type ChromePage, sleep } from "../chrome";
import { check } from "../e2e-support/check";
import { type E2eEnv, fetchPhoneStatus } from "../e2e-support/env";
import type { PhoneStatusResponse } from "../e2e-support/messages";
import type { Phone } from "./phone";

/** Todo lo que necesita un paso de la prueba: app, pestaña de la PC, teléfono y carpeta de capturas. */
export interface Run {
  env: E2eEnv;
  page: ChromePage;
  phone: Phone;
  outDir: string;
}

interface EvaluateResponse {
  result: { value: unknown };
}

interface Metrics {
  viewport: number;
  scrollWidth: number;
}

/** Evalúa una expresión en la página y devuelve su valor. */
export async function evaluate(page: ChromePage, expression: string): Promise<unknown> {
  const response = await page.send<EvaluateResponse>("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  return response.result.value;
}

/** Espera hasta que la expresión sea verdadera (o pasa el tiempo). */
export async function waitFor(page: ChromePage, expression: string, timeoutMs = 5000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await evaluate(page, `Boolean(${expression})`)) return true;
    await sleep(100);
  }
  return false;
}

/** Vuelve la pestaña al tamaño de escritorio usado por la prueba. */
export function desktopViewport(page: ChromePage): Promise<unknown> {
  return page.send("Emulation.setDeviceMetricsOverride", {
    width: 1366,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
}

/** Guarda una captura al ancho indicado y comprueba que no haya desborde horizontal. */
export async function screenshot(run: Run, name: string, width: number, height: number): Promise<void> {
  const { page, outDir } = run;
  await page.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
  await sleep(400);
  const metrics = (await evaluate(
    page,
    "({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth })",
  )) as Metrics;
  const shot = await page.send("Page.captureScreenshot", { format: "png" });
  const file = join(outDir, `${name}.png`);
  await Bun.write(file, Buffer.from(shot.data, "base64"));
  check(metrics.scrollWidth <= metrics.viewport, `captura ${file} sin desborde horizontal`, metrics);
}

/** Cierra el diálogo con el botón de cerrar y comprueba que ya no hay ninguno abierto. */
export async function closeModal(page: ChromePage, id: string): Promise<void> {
  await sleep(500);
  await evaluate(page, `document.querySelector("#${id} .btn-close").click()`);
  check(await waitFor(page, `!document.querySelector(".modal.show")`), `se cierra #${id}`);
}

/** Espera a que el estado del escáner cumpla la condición. */
export async function eventually(
  env: E2eEnv,
  condition: (status: PhoneStatusResponse) => boolean,
  timeoutMs = 3000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (condition(await fetchPhoneStatus(env))) return true;
    await sleep(100);
  }
  return false;
}

/** Abre una ruta en la PC y comprueba el contexto que recibe el teléfono. */
export async function navigate(run: Run, path: string, context: string): Promise<void> {
  await run.page.send("Page.navigate", { url: `${run.env.origin}${path}` });
  const message = await run.phone.next("context", 8000).catch(() => null);
  check(message?.context === context, `el teléfono ve el contexto ${context} al abrir ${path}`, message);
  await sleep(500);
}
