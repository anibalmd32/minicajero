import { afterEach, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ConflictError } from "../../lib/http-errors";
import { PHONE_CLOSE } from "./phone.protocol";
import { PHONE_PORT_FILE, type PhoneScanner } from "./phone.service";
import {
  cleanupScanner,
  connectPhone,
  createScanner,
  currentDataDir,
  expectOnlyMobilePageExposed,
  FakePcTab,
  insecureTls,
  pairingUrl,
  waitForScanResult,
} from "./phone.service.test-support";

afterEach(cleanupScanner);

async function scanRoundTrip(service: PhoneScanner, url: URL): Promise<void> {
  const tab = new FakePcTab();
  const pcTab = service.pcOpened(tab);
  service.hub.pcMessage(pcTab, JSON.stringify({ type: "focus", page: "inventario", visible: true }));
  const { phone, ready } = await connectPhone(url);
  expect(ready.context).toBe("inventario");
  expect(service.status().phones).toHaveLength(1);
  expect(service.status().pairing_expires_at).toBeNull();

  phone.socket.send(JSON.stringify({ type: "scan", id: "p1", code: "7591234567890", format: "ean_13" }));
  const forwarded = await tab.waitForScan();
  const reply = { type: "scan-result", id: forwarded.id, status: "filled", message: "Código cargado" };
  service.hub.pcMessage(pcTab, JSON.stringify(reply));
  const result = await waitForScanResult(phone);
  expect(result).toEqual({ type: "scan-result", id: "p1", status: "filled", message: "Código cargado" });

  service.disconnectAll();
  expect(await phone.closed).toBe(PHONE_CLOSE.disconnectedFromPc);
}

test("empareja por HTTPS, solo expone la página móvil y el WebSocket, y se apaga al desconectar", async () => {
  const service = createScanner();
  const pairing = await service.startPairing();
  expect(pairing.urls).toHaveLength(1);
  const url = pairingUrl(pairing);
  expect(url.pathname).toBe("/movil");
  expect(Number(readFileSync(join(currentDataDir(), "movil", PHONE_PORT_FILE), "utf8"))).toBe(pairing.port);
  expect(pairing.qr_svg).toStartWith("<svg");
  expect(service.status()).toMatchObject({ active: true, port: pairing.port, phones: [] });

  const base = `https://${url.host}`;
  await expectOnlyMobilePageExposed(base);
  await scanRoundTrip(service, url);
  expect(service.status().active).toBe(false);
  await expect(fetch(`${base}/movil`, { tls: insecureTls })).rejects.toThrow();
});

test("sin red local avisa y no enciende nada", async () => {
  const service = createScanner(() => []);
  await expect(service.startPairing()).rejects.toBeInstanceOf(ConflictError);
  expect(service.status().active).toBe(false);
});
