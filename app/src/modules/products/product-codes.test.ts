import { expect, test } from "bun:test";
import { NotFoundError } from "../../lib/http-errors";
import { getProductByCode } from "./products.service";
import { create, db, errorOf, useProductsDatabase } from "./products.test-support";

useProductsDatabase();

test("admite los formatos que lee el teléfono", () => {
  const codes = {
    ean13: "7591234567890",
    ean8: "75912345",
    upcA: "012345678905",
    itf: "12345678901231",
    code39: "ABC-12 $/+%",
    code128: "Lote#42;x=1",
  };
  for (const [name, code] of Object.entries(codes)) {
    expect(create({ name, code, price_usd: 1 }).code).toBe(code.toUpperCase());
  }
  expect(create({ name: "Largo", code: "9".repeat(64), price_usd: 1 }).code).toHaveLength(64);
  expect(errorOf(() => create({ name: "X", code: "9".repeat(65), price_usd: 1 })).details?.code).toBeDefined();
  expect(errorOf(() => create({ name: "X", code: "ñandú", price_usd: 1 })).details?.code).toBeDefined();
  expect(errorOf(() => create({ name: "X", code: "tab	code", price_usd: 1 })).details?.code).toBeDefined();
});

test("busca por código exacto sin distinguir mayúsculas, incluidos los inactivos", () => {
  const product = create({ name: "Harina PAN", code: "Lote-a1", price_usd: 1, active: false });
  expect(getProductByCode("lote-A1", db())).toMatchObject({ id: product.id, active: false });
  expect(getProductByCode("  LOTE-A1 ", db()).id).toBe(product.id);
  const missing = errorOf(() => getProductByCode("7591234567890", db()));
  expect(missing).toBeInstanceOf(NotFoundError);
  expect(missing.message).toBe("No hay ningún producto con el código 7591234567890");
  expect(errorOf(() => getProductByCode("LOTE", db()))).toBeInstanceOf(NotFoundError);
  expect(errorOf(() => getProductByCode("", db()))).toBeInstanceOf(NotFoundError);
});
