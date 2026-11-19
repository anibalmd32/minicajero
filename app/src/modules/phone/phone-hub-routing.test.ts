import { expect, test } from "bun:test";
import { focusJson, scanResultJson, setup } from "./phone-hub.test-support";

test("sin pantalla de Ventas o Inventario responde no-target", () => {
  const { pairPhone, openTab, scan } = setup();
  openTab("facturas");
  const { socket, phone } = pairPhone();
  scan(phone, "a1", "7591234567890");
  expect(socket.last("scan-result")).toEqual({
    type: "scan-result",
    id: "a1",
    status: "no-target",
    message: "Abre Ventas o Inventario en la computadora",
  });
});

test("va a la pestaña visible enfocada más recientemente y devuelve su respuesta", () => {
  const { pairPhone, openTab, scan, hub } = setup();
  const ventas = openTab("ventas");
  const inventario = openTab("inventario");
  const { socket, phone } = pairPhone();
  expect(socket.last("ready").context).toBe("inventario");

  scan(phone, "a1", " 7591234567890 ");
  const forwarded = inventario.socket.last("scan");
  expect(forwarded).toMatchObject({ code: "7591234567890", format: "ean_13", phone: { name: "Android · Chrome" } });
  expect(ventas.socket.all("scan")).toHaveLength(0);

  hub.pcMessage(inventario.tab, scanResultJson(forwarded.id, "filled", "Código cargado"));
  const expected = { type: "scan-result", id: "a1", status: "filled", message: "Código cargado" } as const;
  expect(socket.last("scan-result")).toEqual(expected);

  hub.pcMessage(ventas.tab, focusJson("ventas", true));
  expect(socket.last("context").context).toBe("ventas");
  scan(phone, "a2", "7591234567890");
  expect(ventas.socket.all("scan")).toHaveLength(1);
});

test("prefiere una pestaña visible a una oculta y cambia el contexto al ocultarse", () => {
  const { pairPhone, openTab, scan, hub } = setup();
  const ventas = openTab("ventas");
  const inventario = openTab("inventario");
  const { socket, phone } = pairPhone();
  hub.pcMessage(inventario.tab, focusJson("inventario", false));
  expect(socket.last("context").context).toBe("ventas");
  scan(phone, "a1", "123");
  expect(ventas.socket.all("scan")).toHaveLength(1);
  hub.pcMessage(ventas.tab, focusJson("clientes", true));
  expect(socket.last("context").context).toBe("inventario");
  hub.pcClosed(inventario.tab);
  expect(socket.last("context").context).toBe("ninguno");
});

test("ignora respuestas de otra pestaña o con id desconocido", () => {
  const { pairPhone, openTab, scan, hub } = setup();
  const ventas = openTab("ventas");
  const intruder = openTab();
  const { socket, phone } = pairPhone();
  scan(phone, "a1", "123");
  const forwarded = ventas.socket.last("scan");
  hub.pcMessage(intruder.tab, scanResultJson(forwarded.id, "added", "falso"));
  hub.pcMessage(ventas.tab, scanResultJson("otro", "added", "falso"));
  expect(socket.all("scan-result")).toHaveLength(0);
  hub.pcMessage(ventas.tab, scanResultJson(forwarded.id, "no-stock", ""));
  expect(socket.last("scan-result")).toMatchObject({ id: "a1", status: "no-stock", message: "Sin stock" });
});
