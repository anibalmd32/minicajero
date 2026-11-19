import { expect, test } from "bun:test";
import { PHONE_CLOSE } from "./phone.protocol";
import { DEFAULT_IP, helloJson, phoneIdOf, sessionIdOf, setup } from "./phone-hub.test-support";

test("reconectar con la sesión reemplaza la conexión anterior", () => {
  const { hub, pairPhone, openRaw } = setup();
  const first = pairPhone();
  const second = openRaw(DEFAULT_IP);
  hub.phoneMessage(second.phone, helloJson(first.socket.last("ready").session));
  expect(second.socket.last("ready").phone.id).toBe(first.socket.last("ready").phone.id);
  expect(first.socket.closed?.code).toBe(PHONE_CLOSE.replaced);
  expect(hub.connectedPhones()).toHaveLength(1);
});

test("al despedirse el teléfono su sesión deja de servir", () => {
  const { hub, pairPhone, openTab, registry } = setup();
  const pc = openTab();
  const { socket, phone } = pairPhone();
  const session = socket.last("ready").session;
  hub.phoneMessage(phone, JSON.stringify({ type: "bye" }));
  expect(socket.closed?.code).toBe(1000);
  expect(hub.hasPhoneConnections()).toBe(false);
  expect(pc.socket.last("phones").phones).toEqual([]);
  expect(registry.redeem(session, DEFAULT_IP)).toEqual({ ok: false, reason: "invalid" });
});

test("desconectar un teléfono desde la PC anula solo su sesión", () => {
  const { hub, pairPhone, openTab, registry } = setup();
  const pc = openTab();
  const a = pairPhone();
  const b = pairPhone("192.168.1.21");
  const session = a.socket.last("ready").session;
  expect(hub.disconnectPhone(phoneIdOf(a.phone))).toBe(true);
  expect(a.socket.closed?.code).toBe(PHONE_CLOSE.disconnectedFromPc);
  expect(b.socket.closed).toBeNull();
  expect(pc.socket.last("phones").phones.map((phone) => phone.id)).toEqual([phoneIdOf(b.phone)]);
  expect(registry.redeem(session, DEFAULT_IP)).toEqual({ ok: false, reason: "invalid" });
  expect(hub.disconnectPhone("desconocido")).toBe(false);
});

test("desconectar todo y sesiones vencidas", () => {
  const { hub, pairPhone } = setup();
  const a = pairPhone();
  const b = pairPhone("192.168.1.21");
  hub.closeExpiredSessions([sessionIdOf(b.phone)]);
  expect(b.socket.closed?.code).toBe(PHONE_CLOSE.sessionExpired);
  hub.disconnectAllPhones();
  expect(a.socket.closed?.code).toBe(PHONE_CLOSE.disconnectedFromPc);
  expect(hub.connectedPhones()).toEqual([]);
});
