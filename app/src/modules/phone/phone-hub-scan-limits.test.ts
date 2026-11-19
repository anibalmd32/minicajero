import { expect, test } from "bun:test";
import { PHONE_TEXTS } from "./phone-hub";
import { scanResultJson, setup } from "./phone-hub.test-support";

test("si la PC no responde a tiempo avisa con un error amable", async () => {
  const { pairPhone, openTab, scan, hub } = setup({ scanTimeoutMs: 20 });
  const ventas = openTab("ventas");
  const { socket, phone } = pairPhone();
  scan(phone, "a1", "123");
  await Bun.sleep(40);
  expect(socket.last("scan-result")).toEqual({
    type: "scan-result",
    id: "a1",
    status: "error",
    message: PHONE_TEXTS.timeout,
  });
  hub.pcMessage(ventas.tab, scanResultJson(ventas.socket.last("scan").id, "added", "tarde"));
  expect(socket.all("scan-result")).toHaveLength(1);
});

test("si se cierra la pestaña con escaneos pendientes avisa al teléfono", () => {
  const { pairPhone, openTab, scan, hub } = setup();
  const ventas = openTab("ventas");
  const { socket, phone } = pairPhone();
  scan(phone, "a1", "123");
  hub.pcClosed(ventas.tab);
  expect(socket.last("scan-result")).toMatchObject({ id: "a1", status: "error", message: PHONE_TEXTS.tabClosed });
});

test("valida el código antes de reenviarlo", () => {
  const { pairPhone, openTab, scan } = setup();
  const ventas = openTab("ventas");
  const { socket, phone } = pairPhone();
  for (const code of ["", "   ", "abc\u0007", "x".repeat(65), "código"]) scan(phone, `c${code.length}`, code);
  expect(ventas.socket.all("scan")).toHaveLength(0);
  expect(socket.all("scan-result").every((result) => result.status === "error")).toBe(true);
  scan(phone, "ok", "ABC-123 45/6.7");
  expect(ventas.socket.last("scan").code).toBe("ABC-123 45/6.7");
});

test("limita los escaneos pendientes por teléfono", () => {
  const { pairPhone, openTab, scan } = setup();
  const ventas = openTab("ventas");
  const { socket, phone } = pairPhone();
  for (let index = 0; index < 6; index++) scan(phone, `a${index}`, "123");
  expect(ventas.socket.all("scan")).toHaveLength(5);
  expect(socket.last("scan-result")).toMatchObject({ id: "a5", status: "error", message: PHONE_TEXTS.busy });
});
