import { expect, test } from "bun:test";
import { PHONE_CLOSE } from "./phone.protocol";
import { MAX_UNIDENTIFIED_PER_IP, MAX_UNIDENTIFIED_TOTAL, PHONE_TEXTS } from "./phone-hub";
import { ATTACKER_IP, DEFAULT_IP, helloJson, setup } from "./phone-hub.test-support";

test("las conexiones sin identificar no cuentan como teléfonos y están limitadas", () => {
  const { hub, pairPhone, openRaw } = setup();
  for (let index = 0; index < MAX_UNIDENTIFIED_PER_IP; index++) {
    expect(hub.admissionError(ATTACKER_IP)).toBeNull();
    openRaw(ATTACKER_IP);
  }
  expect(hub.hasPhoneConnections()).toBe(true);
  expect(hub.hasIdentifiedPhones()).toBe(false);
  expect(hub.admissionError(ATTACKER_IP)).toEqual({ code: PHONE_CLOSE.busy, reason: PHONE_TEXTS.busy });
  expect(hub.admissionError("192.168.1.67")).toBeNull();
  for (let index = MAX_UNIDENTIFIED_PER_IP; index < MAX_UNIDENTIFIED_TOTAL; index++) openRaw(`10.0.0.${index}`);
  expect(hub.admissionError("192.168.1.67")?.code).toBe(PHONE_CLOSE.busy);
  pairPhone(DEFAULT_IP);
  expect(hub.hasIdentifiedPhones()).toBe(true);
});

test("una IP bloqueada no puede abrir conexiones hasta que la PC genere otro QR", () => {
  const { hub, registry, openRaw } = setup();
  for (let attempt = 0; attempt < 5; attempt++) {
    hub.phoneMessage(openRaw(ATTACKER_IP).phone, helloJson("x".repeat(43)));
  }
  expect(hub.admissionError(ATTACKER_IP)).toEqual({
    code: PHONE_CLOSE.tooManyAttempts,
    reason: PHONE_TEXTS.locked,
  });
  const { token } = registry.createPairing();
  expect(hub.admissionError(ATTACKER_IP)).toBeNull();
  const { socket, phone } = openRaw(ATTACKER_IP);
  hub.phoneMessage(phone, helloJson(token));
  expect(socket.all("ready")).toHaveLength(1);
});
