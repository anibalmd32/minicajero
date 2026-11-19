import { expect, test } from "bun:test";
import { ConflictError, NotFoundError } from "../../lib/http-errors";
import { deleteProduct, getProduct, updateProduct } from "./products.service";
import { addSale, create, db, errorOf, harina, useProductsDatabase } from "./products.test-support";

useProductsDatabase();

test("consulta, actualiza y conserva code y active si se omiten", () => {
  const created = create(harina);
  expect(getProduct(created.id, db())).toEqual(created);
  const inactive = updateProduct(created.id, { name: "Harina", price_usd: 2, active: false }, db());
  expect(inactive).toMatchObject({ code: "HAR-001", name: "Harina", price_usd_cents: 200, active: false, stock: 10 });
  expect(updateProduct(created.id, { name: "Harina", price_usd: 2 }, db())).toMatchObject({
    code: "HAR-001",
    active: false,
  });
  expect(updateProduct(created.id, { name: "Harina", price_usd: 2, code: "" }, db()).code).toBeNull();
  expect(updateProduct(created.id, { name: "Harina", price_usd: 2, code: "har-002" }, db()).code).toBe("HAR-002");
  expect(updateProduct(created.id, { name: "Harina", price_usd: 2, code: null }, db()).code).toBeNull();
  expect(() => getProduct(999, db())).toThrow(NotFoundError);
  expect(() => updateProduct(999, harina, db())).toThrow(NotFoundError);
});

test("PUT no cambia el stock: lo acepta solo si coincide con el actual", () => {
  const created = create(harina);
  expect(updateProduct(created.id, { ...harina, stock: 10 }, db()).stock).toBe(10);
  expect(errorOf(() => updateProduct(created.id, { ...harina, stock: 11 }, db())).details?.stock).toContain(
    "ajuste de stock",
  );
});

test("elimina si no tiene ventas; con ventas 409 sugiriendo desactivar", () => {
  const free = create(harina);
  deleteProduct(free.id, db());
  expect(() => getProduct(free.id, db())).toThrow(NotFoundError);
  expect(() => deleteProduct(free.id, db())).toThrow(NotFoundError);
  const sold = create({ ...harina, code: null });
  addSale(sold.id);
  const err = errorOf(() => deleteProduct(sold.id, db()));
  expect(err).toBeInstanceOf(ConflictError);
  expect(err.message).toContain("Desactívalo");
  expect(getProduct(sold.id, db()).id).toBe(sold.id);
});
