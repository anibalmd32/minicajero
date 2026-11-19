import { mkdirSync } from "node:fs";
import { openChromePage } from "./chrome";
import { positionalArgs } from "./e2e-session";
import { check, finish } from "./e2e-support/check";
import { loadEnv } from "./e2e-support/env";
import {
  inventarioFoundSteps,
  inventarioModalScanSteps,
  inventarioNewProductSteps,
  inventarioStockModalSteps,
} from "./phone-scan-e2e/inventario-steps";
import {
  closeModalSteps,
  connectModalSteps,
  disconnectSteps,
  navbarShotsSteps,
  secondPhoneSteps,
} from "./phone-scan-e2e/phone-modal-steps";
import type { Run } from "./phone-scan-e2e/run";
import {
  connectPhoneToVentas,
  ventasCartSteps,
  ventasCheckoutSteps,
  ventasStockSteps,
  ventasUnavailableSteps,
} from "./phone-scan-e2e/ventas-steps";

/**
 * Prueba de punta a punta del escaneo en Ventas e Inventario: abre la app en Chrome headless (la "PC"),
 * empareja un teléfono simulado por la API y le manda códigos por el WebSocket seguro, comprobando la respuesta
 * en el teléfono y el resultado en la página. Guarda capturas en la carpeta indicada.
 * Necesita una base de datos con estos productos (código, nombre, stock, activo):
 * 7591234567890 Harina PAN 1 kg (3, sí) · LOTE/A B Café molido (0, sí) · ABC-001 Azúcar morena (10, no) · .. Bolsa plástica (5, sí).
 * Uso: bun scripts/phone-scan-e2e.ts http://127.0.0.1:4000 <carpeta-capturas> [--login=usuario:clave]
 */
const env = await loadEnv();
const outDir = positionalArgs(process.argv.slice(2))[1] ?? "capturas-telefono";
mkdirSync(outDir, { recursive: true });

const page = await openChromePage();
try {
  await page.send("Network.enable", {});
  await page.send("Network.setCookie", {
    name: env.sessionName,
    value: env.sessionValue,
    domain: env.appUrl.hostname,
    path: "/",
  });
  const phone = await connectPhoneToVentas(env, page);
  const run: Run = { env, page, phone, outDir };
  await ventasCartSteps(run);
  await ventasStockSteps(run);
  await ventasUnavailableSteps(run);
  await ventasCheckoutSteps(run);
  await inventarioNewProductSteps(run);
  await inventarioModalScanSteps(run);
  await inventarioFoundSteps(run);
  await inventarioStockModalSteps(run);
  await navbarShotsSteps(run);
  await connectModalSteps(run);
  const secondPhone = await secondPhoneSteps(run);
  await disconnectSteps(run, secondPhone);
  await closeModalSteps(run);
  const errors = page.errors.filter((error) => !/status of 404 .*\/api\/v1\/products\/by-code\?/.test(error));
  for (const error of errors) console.log(`ERROR JS: ${error}`);
  check(errors.length === 0, "sin errores de JS en la página (los 404 de códigos desconocidos son esperados)");
} finally {
  await page.close();
}

finish();
