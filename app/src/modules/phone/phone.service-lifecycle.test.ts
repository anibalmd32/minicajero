import { afterEach, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ConflictError } from "../../lib/http-errors";
import { PHONE_CLOSE } from "./phone.protocol";
import {
  cleanupScanner,
  connectPhone,
  createScanner,
  currentDataDir,
  LOOPBACK,
  openPhone,
  pairingUrl,
  tokenOf,
  waitFor,
} from "./phone.service.test-support";

afterEach(cleanupScanner);

test("se apaga solo tras un rato sin teléfonos ni QR pendiente", async () => {
  let now = Date.now();
  const service = createScanner(
    () => [LOOPBACK],
    () => now,
  );
  await service.startPairing();
  now += 11 * 60 * 1000;
  service.sweep();
  expect(service.status()).toMatchObject({ active: true, pairing_expires_at: null });
  now += 999;
  service.sweep();
  expect(service.status().active).toBe(true);
  now += 1;
  service.sweep();
  expect(service.status().active).toBe(false);
});

test("cerrar el QR sin usarlo apaga el servidor en el acto, salvo que haya teléfonos emparejados", async () => {
  const service = createScanner();
  const firstToken = tokenOf(pairingUrl(await service.startPairing()));
  const second = await service.startPairing();
  service.cancelPairing(firstToken);
  expect(service.status()).toMatchObject({ active: true });
  expect(service.status().pairing_expires_at).not.toBeNull();
  service.cancelPairing(tokenOf(pairingUrl(second)));
  expect(service.status()).toMatchObject({ active: false, pairing_expires_at: null });

  const third = await service.startPairing();
  const { phone } = await connectPhone(pairingUrl(third));
  const fourth = await service.startPairing();
  service.cancelPairing(tokenOf(pairingUrl(fourth)));
  expect(service.status()).toMatchObject({ active: true, pairing_expires_at: null });
  expect(service.status().phones).toHaveLength(1);
  phone.socket.close();
});

test("si no se puede encender el servidor avisa con un mensaje amable", async () => {
  const service = createScanner();
  writeFileSync(join(currentDataDir(), "movil"), "ocupado");
  const attempt = service.startPairing();
  await expect(attempt).rejects.toBeInstanceOf(ConflictError);
  await expect(attempt).rejects.toThrow(
    "No se pudo activar la conexión con el teléfono. Cierra otros programas e inténtalo de nuevo.",
  );
  expect(service.status().active).toBe(false);
});

test("las conexiones sin identificarse no impiden el apagado por inactividad", async () => {
  let now = Date.now();
  const service = createScanner(
    () => [LOOPBACK],
    () => now,
  );
  const pairing = await service.startPairing();
  const intruder = await openPhone(`wss://${pairingUrl(pairing).host}/movil/ws`);
  await waitFor(() => (service.hub.hasPhoneConnections() ? true : undefined));
  now += 11 * 60 * 1000;
  service.sweep();
  now += 1000;
  service.sweep();
  expect(service.status().active).toBe(false);
  expect(await intruder.closed).toBe(PHONE_CLOSE.disconnectedFromPc);
});
