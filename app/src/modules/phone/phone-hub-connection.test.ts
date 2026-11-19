import { expect, test } from "bun:test";
import { PHONE_CLOSE, PHONE_PROTOCOL_VERSION } from "./phone.protocol";
import { PHONE_TEXTS } from "./phone-hub";
import { ATTACKER_IP, DEFAULT_IP, helloJson, setup } from "./phone-hub.test-support";

test("con el token del QR el teléfono queda listo y la PC lo ve", () => {
  const { pairPhone, openTab, hub, logs } = setup();
  const pc = openTab();
  const { socket } = pairPhone();
  const ready = socket.last("ready");
  expect(ready).toMatchObject({
    version: PHONE_PROTOCOL_VERSION,
    context: "ninguno",
    phone: { name: "Android · Chrome" },
  });
  expect(ready.session).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(pc.socket.last("phones").phones).toHaveLength(1);
  expect(hub.connectedPhones()).toHaveLength(1);
  expect(logs.join("\n")).not.toContain(ready.session);
});

test("token inválido: cierra con código y motivo, sin dejar rastro del token en el log", () => {
  const { hub, logs, openRaw } = setup();
  const { socket, phone } = openRaw(ATTACKER_IP);
  hub.phoneMessage(phone, helloJson("token-secreto-falso"));
  expect(socket.closed).toEqual({ code: PHONE_CLOSE.invalidToken, reason: PHONE_TEXTS.invalidToken });
  expect(hub.hasPhoneConnections()).toBe(false);
  expect(logs.join("\n")).not.toContain("token-secreto-falso");
});

test("tras varios fallos la IP queda bloqueada", () => {
  const { hub, openRaw } = setup();
  let last = openRaw(ATTACKER_IP);
  hub.phoneMessage(last.phone, helloJson("x".repeat(43)));
  for (let attempt = 1; attempt < 5; attempt++) {
    last = openRaw(ATTACKER_IP);
    hub.phoneMessage(last.phone, helloJson("x".repeat(43)));
  }
  expect(last.socket.closed?.code).toBe(PHONE_CLOSE.tooManyAttempts);
});

test("escanear antes de identificarse, mensajes rotos o versión vieja cierran la conexión", () => {
  const { hub, registry, openRaw } = setup();
  const early = openRaw(DEFAULT_IP);
  hub.phoneMessage(early.phone, JSON.stringify({ type: "scan", id: "1", code: "123" }));
  expect(early.socket.closed?.code).toBe(PHONE_CLOSE.badMessage);

  const broken = openRaw(DEFAULT_IP);
  hub.phoneMessage(broken.phone, "{no es json");
  expect(broken.socket.closed?.code).toBe(PHONE_CLOSE.badMessage);

  const outdated = openRaw(DEFAULT_IP);
  hub.phoneMessage(outdated.phone, helloJson(registry.createPairing().token, 99));
  expect(outdated.socket.closed?.code).toBe(PHONE_CLOSE.outdated);
});

test("si no se identifica a tiempo se cierra", async () => {
  const { hub, openRaw } = setup({ helloTimeoutMs: 20 });
  const { socket } = openRaw(DEFAULT_IP);
  await Bun.sleep(40);
  expect(socket.closed?.code).toBe(PHONE_CLOSE.helloTimeout);
  expect(hub.hasPhoneConnections()).toBe(false);
});
