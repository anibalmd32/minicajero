import { expect, test } from "bun:test";
import { ConflictError } from "../../lib/http-errors";
import { updateProduct } from "./products.service";
import { create, db, errorOf, harina, useProductsDatabase } from "./products.test-support";

useProductsDatabase();

test("crea con precio en centavos, código en mayúsculas y valores por defecto", () => {
  const product = create(harina);
  expect(product).toMatchObject({
    code: "HAR-001",
    name: "Harina PAN 1kg",
    price_usd_cents: 125,
    stock: 10,
    active: true,
    low_stock: false,
  });
  const minimal = create({ name: "Agua", price_usd: 0.5 });
  expect(minimal).toMatchObject({ code: null, stock: 0, active: true, low_stock: true });
});

test("informa errores por campo", () => {
  expect(errorOf(() => create({})).details).toEqual({
    name: "Este campo es obligatorio",
    price_usd: "Este campo es obligatorio",
  });
  const details = errorOf(() =>
    create({ code: "café", name: "!!!", price_usd: 1.234, stock: -1, active: "si" }),
  ).details;
  expect(Object.keys(details ?? {}).sort()).toEqual(["active", "code", "name", "price_usd", "stock"]);
  expect(errorOf(() => create({ name: "X", price_usd: 1, stock: 1.5 })).details?.stock).toBe(
    "Debe ser un número entero",
  );
  expect(errorOf(() => create({ name: "X", price_usd: -1 })).details?.price_usd).toBeDefined();
  expect(errorOf(() => create({ name: "X", price_usd: "12.5" })).details?.price_usd).toBe("Debe ser un número");
});

test("409 con details.code si el código existe (sin distinguir mayúsculas)", () => {
  const first = create(harina);
  const other = create({ ...harina, code: "OTRO" });
  for (const action of [() => create({ ...harina, code: "HAR-001" }), () => updateProduct(other.id, harina, db())]) {
    const err = errorOf(action);
    expect(err).toBeInstanceOf(ConflictError);
    expect(err.details?.code).toContain("HAR-001");
  }
  expect(updateProduct(first.id, { ...harina, name: "Harina" }, db()).name).toBe("Harina");
  expect(create({ ...harina, code: "" }).code).toBeNull();
  expect(create({ ...harina, code: null }).code).toBeNull();
});
