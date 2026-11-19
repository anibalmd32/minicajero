import { check } from "../e2e-support/check";
import { insecureTls } from "../e2e-support/env";

const BLOCKED_LAN_PATHS = [
  "/",
  "/ventas",
  "/inventario",
  "/api/v1/health",
  "/api/v1/products",
  "/api/v1/phone/status",
  "/movil/otra",
  "/_bun/hmr",
];

async function checkMobilePage(lanBase: string): Promise<void> {
  const page = await fetch(`${lanBase}/movil`, { tls: insecureTls });
  const pageHtml = await page.text();
  check(page.status === 200 && pageHtml.includes("Escáner"), "GET /movil por HTTPS → página móvil", page.status);
  const assets = [...pageHtml.matchAll(/(?:src|href)="([^"]+)"/g)].flatMap((match) => (match[1] ? [match[1]] : []));
  for (const asset of assets) {
    const response = await fetch(new URL(asset, `${lanBase}/movil`), { tls: insecureTls });
    check(response.status === 200, `asset ${new URL(asset, lanBase).pathname} → 200`, response.status);
  }
}

/** Comprueba que el servidor del teléfono solo sirve la página móvil, sus archivos y el WebSocket. */
export async function checkLanSurface(lanBase: string): Promise<void> {
  await checkMobilePage(lanBase);
  for (const path of BLOCKED_LAN_PATHS) {
    const response = await fetch(`${lanBase}${path}`, { tls: insecureTls });
    check(response.status === 404, `LAN ${path} → 404`, response.status);
  }
  const plainSocketRoute = await fetch(`${lanBase}/movil/ws`, { tls: insecureTls });
  check(plainSocketRoute.status === 426, "LAN /movil/ws sin WebSocket → 426", plainSocketRoute.status);
}
