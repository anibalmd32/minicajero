import { afterEach, expect, test } from "bun:test";
import { PHONE_CLOSE } from "./phone.protocol";
import {
  cleanupScanner,
  connectPhone,
  createScanner,
  insecureTls,
  LOOPBACK,
  pairingUrl,
  readCertificate,
  WIFI,
} from "./phone.service.test-support";

afterEach(cleanupScanner);

test("reutiliza el puerto y el certificado, y los renueva si cambia la IP", async () => {
  let addresses = [LOOPBACK];
  const service = createScanner(() => addresses);
  const first = await service.startPairing();
  const certificate = readCertificate();
  const second = await service.startPairing();
  expect(second.port).toBe(first.port);
  expect(pairingUrl(second).hash).not.toBe(pairingUrl(first).hash);
  expect(readCertificate()).toBe(certificate);

  addresses = [LOOPBACK, { ip: "192.168.77.5", interfaceName: "Ethernet", label: "Cable de red" }];
  const third = await service.startPairing();
  expect(third.urls.map((url) => url.ip)).toEqual(["127.0.0.1", "192.168.77.5"]);
  expect(third.port).toBe(first.port);
  expect(readCertificate()).not.toBe(certificate);
  expect((await fetch(`https://127.0.0.1:${third.port}/movil`, { tls: insecureTls })).status).toBe(200);
});

test("al renovar el certificado los teléfonos reconectan con su sesión y se conservan las IP anteriores", async () => {
  let addresses = [LOOPBACK];
  const service = createScanner(() => addresses);
  const url = pairingUrl(await service.startPairing());
  const { phone, ready } = await connectPhone(url);

  addresses = [LOOPBACK, WIFI];
  await service.startPairing();
  expect(await phone.closed).toBe(PHONE_CLOSE.restarting);
  const certificate = readCertificate();

  const again = await connectPhone(url, ready.session);
  expect(again.ready.phone.id).toBe(ready.phone.id);

  addresses = [WIFI];
  await service.startPairing();
  addresses = [LOOPBACK];
  await service.startPairing();
  expect(readCertificate()).toBe(certificate);
  expect(service.status().phones).toHaveLength(1);
  again.phone.socket.close();
});
