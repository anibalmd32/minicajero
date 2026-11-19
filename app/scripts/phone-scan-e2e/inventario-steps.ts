import { check } from "../e2e-support/check";
import { expectScan } from "./expect-scan";
import { closeModal, desktopViewport, evaluate, navigate, type Run, screenshot, waitFor } from "./run";

const HARINA = "7591234567890";
const NEW_CODE = "7590000000017";
const FILLED_CODE = "7590000000024";
const ADJUST_BUTTON = `[...document.querySelectorAll(".toast .btn")].find((el) => el.textContent === "Ajustar stock")`;

/** Inventario: un código nuevo abre Nuevo producto con el código puesto y el foco en el nombre. */
export async function inventarioNewProductSteps(run: Run): Promise<void> {
  const { phone, page } = run;
  await navigate(run, "/inventario", "inventario");
  await expectScan(
    phone,
    NEW_CODE,
    { status: "created", message: "Código nuevo: complétalo en la computadora" },
    "Inventario: código nuevo abre Nuevo producto",
  );
  check(
    await waitFor(
      page,
      `document.getElementById("product-modal").classList.contains("show") && document.activeElement?.id === "product_name"`,
    ),
    "modal abierto con el foco en el nombre",
  );
  check(
    (await evaluate(page, `document.getElementById("product_code").value`)) === NEW_CODE,
    "el código ya está puesto",
  );
  await screenshot(run, "inventario-nuevo-1366", 1366, 900);
  await screenshot(run, "inventario-nuevo-375", 375, 812);
  await desktopViewport(page);
}

/** Inventario: con el modal abierto avisa del código repetido y rellena un código libre. */
export async function inventarioModalScanSteps(run: Run): Promise<void> {
  const { phone, page } = run;
  await expectScan(
    phone,
    HARINA,
    { status: "error", message: "Ese código ya es de Harina PAN 1 kg" },
    "Inventario: avisa si el código ya es de otro producto",
  );
  check(
    (await evaluate(page, `document.querySelector('[data-feedback-for="code"]')?.textContent`)) ===
      "Ya lo usa Harina PAN 1 kg (7591234567890)",
    "marca el campo código con el error",
  );
  await evaluate(page, `document.getElementById("product_name").value = "Galletas María"`);
  await expectScan(
    phone,
    FILLED_CODE,
    { status: "filled", message: "Código listo en la computadora" },
    "Inventario: con el modal abierto rellena el código",
  );
  check(
    await waitFor(
      page,
      `document.getElementById("product_code").value === "${FILLED_CODE}" && document.activeElement?.id === "product_price" && !document.querySelector('[data-feedback-for="code"]')`,
    ),
    "rellena el código, quita el error y enfoca el precio",
  );
  await closeModal(page, "product-modal");
}

/** Inventario: un producto existente se busca, se resalta y ofrece Ajustar stock. */
export async function inventarioFoundSteps(run: Run): Promise<void> {
  const { phone, page } = run;
  await expectScan(
    phone,
    HARINA,
    { status: "found", message: "Producto encontrado: Harina PAN 1 kg" },
    "Inventario: producto existente",
  );
  check(
    await waitFor(
      page,
      `document.getElementById("product-search").value === "${HARINA}" && document.querySelector('#products-body tr[data-id="1"].scan-flash')`,
    ),
    "lo busca y lo resalta",
  );
  check(await waitFor(page, `${ADJUST_BUTTON} !== undefined`), "ofrece Ajustar stock");
  await screenshot(run, "inventario-encontrado-1366", 1366, 900);
  await expectScan(
    phone,
    "..",
    { status: "found", message: "Producto encontrado: Bolsa plástica" },
    "Inventario: un código hecho solo de puntos también se encuentra",
  );
}

/** Inventario: el botón del toast abre Ajustar stock y, con ese diálogo abierto, el escaneo no hace nada. */
export async function inventarioStockModalSteps(run: Run): Promise<void> {
  const { phone, page } = run;
  await evaluate(page, `${ADJUST_BUTTON}.click()`);
  check(
    await waitFor(page, `document.getElementById("stock-modal").classList.contains("show")`),
    "el botón del toast abre Ajustar stock",
  );
  await expectScan(
    phone,
    HARINA,
    { status: "no-target", message: "Termina el ajuste de stock en la computadora" },
    "Inventario: con el ajuste de stock abierto no hace nada",
  );
  await closeModal(page, "stock-modal");
}
