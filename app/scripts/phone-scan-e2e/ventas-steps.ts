import type { ChromePage } from "../chrome";
import { check } from "../e2e-support/check";
import type { E2eEnv } from "../e2e-support/env";
import { expectScan } from "./expect-scan";
import { type Phone, pairPhone } from "./phone";
import { closeModal, desktopViewport, evaluate, eventually, navigate, type Run, screenshot, waitFor } from "./run";

const HARINA = "7591234567890";
const UNKNOWN_CODE = "7590000000017";
const TOAST_ADDED = `[...document.querySelectorAll(".toast-body")].some((el) => el.textContent === "Agregado: Harina PAN 1 kg")`;

/** Abre Ventas, empareja el teléfono y comprueba que la PC lo ve. */
export async function connectPhoneToVentas(env: E2eEnv, page: ChromePage): Promise<Phone> {
  await desktopViewport(page);
  await page.send("Page.navigate", { url: `${env.origin}/ventas` });
  await Bun.sleep(1500);
  await evaluate(page, "localStorage.clear()");
  const phone = await pairPhone(env);
  const ready = await phone.next("ready");
  check(ready.context === "ventas", "emparejado con la pestaña de Ventas abierta", ready.context);
  check(
    await waitFor(page, `document.querySelector(".nav-phone-count:not(.d-none)")?.textContent === "1"`),
    "la navbar muestra 1 teléfono conectado",
  );
  return phone;
}

/** Ventas: escanear agrega al carrito y suma, con toast y captura. */
export async function ventasCartSteps(run: Run): Promise<void> {
  const { phone, page } = run;
  await expectScan(
    phone,
    HARINA,
    { status: "added", message: "Harina PAN 1 kg · 1 en el carrito" },
    "Ventas: escanear agrega al carrito",
  );
  await expectScan(phone, HARINA, { message: "Harina PAN 1 kg · 2 en el carrito" }, "Ventas: escanear otra vez suma 1");
  check(
    await waitFor(page, `document.querySelector('.pos-line [data-action="quantity"]')?.value === "2"`),
    "el carrito de la PC tiene 2 unidades",
  );
  check(await waitFor(page, TOAST_ADDED), "toast en la PC");
  await screenshot(run, "ventas-escaneo-1366", 1366, 900);
}

/** Ventas: escaneo con el diálogo Conectar teléfono abierto, límite de stock, sin stock, inactivo y desconocido. */
export async function ventasStockSteps(run: Run): Promise<void> {
  const { phone, page, env } = run;
  await evaluate(page, `document.querySelector(".nav-phone").click()`);
  await Bun.sleep(150);
  await expectScan(
    phone,
    HARINA,
    { message: "Harina PAN 1 kg · 3 en el carrito" },
    "Ventas: un escaneo mientras se abre Conectar teléfono cierra el diálogo y agrega",
  );
  check(await waitFor(page, `!document.querySelector(".modal.show")`), "el diálogo Conectar teléfono quedó cerrado");
  check(await eventually(env, (status) => status.pairing_expires_at === null), "al cerrarse el diálogo se anula su QR");
  await expectScan(
    phone,
    HARINA,
    { status: "no-stock", message: "No hay más Harina PAN 1 kg: 3 en el carrito" },
    "Ventas: respeta el stock",
  );
}

/** Ventas: productos sin stock, inactivos y desconocidos; captura móvil. */
export async function ventasUnavailableSteps(run: Run): Promise<void> {
  const { phone, page } = run;
  await expectScan(
    phone,
    "lote/a b",
    { status: "no-stock", message: "Sin stock: Café molido" },
    "Ventas: sin stock (código insensible a mayúsculas)",
  );
  await expectScan(
    phone,
    "ABC-001",
    { status: "not-found", message: "Azúcar morena está desactivado" },
    "Ventas: producto inactivo no disponible",
  );
  await expectScan(
    phone,
    UNKNOWN_CODE,
    { status: "not-found", message: `No hay ningún producto con el código ${UNKNOWN_CODE}` },
    "Ventas: código desconocido",
  );
  await screenshot(run, "ventas-escaneo-375", 375, 812);
  await desktopViewport(page);
}

/** Ventas: con el cobro abierto no agrega; en otra página no hay destino. */
export async function ventasCheckoutSteps(run: Run): Promise<void> {
  const { phone, page } = run;
  await evaluate(page, `document.getElementById("pos-confirm").click()`);
  if (await waitFor(page, `document.getElementById("sale-modal").classList.contains("show")`)) {
    await expectScan(
      phone,
      HARINA,
      { status: "no-target", message: "Termina el cobro en la computadora" },
      "Ventas: con el cobro abierto no agrega",
    );
    await closeModal(page, "sale-modal");
  } else {
    check(false, "se abre el resumen de cobro");
  }
  await navigate(run, "/", "ninguno");
  await expectScan(
    phone,
    HARINA,
    { status: "no-target", message: "Abre Ventas o Inventario en la computadora" },
    "en otra página → no-target",
  );
}
