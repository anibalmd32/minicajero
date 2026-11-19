import { expect, test } from "bun:test";
import { BadRequestError } from "../../lib/http-errors";
import { groupSaleLines, validateSale } from "./invoices.service";
import { errorOf } from "./invoices.test-support";

test("agrupa líneas repetidas del mismo producto en el orden de su primera aparición", () => {
  const sale = validateSale({
    payment_type: "cash",
    items: [
      { product_id: 2, quantity: 1 },
      { product_id: 1, quantity: 3 },
      { product_id: 2, quantity: 4 },
    ],
    notes: "  Entregar mañana ",
  });
  expect(sale).toEqual({
    customer_id: null,
    payment_type: "cash",
    lines: [
      { product_id: 2, quantity: 5 },
      { product_id: 1, quantity: 3 },
    ],
    notes: "Entregar mañana",
    expected_rate: null,
    expected_tax_percent: null,
  });
  expect(groupSaleLines([])).toEqual([]);
});

test("exige cantidades enteras mayores que 0 e informa el campo de cada línea", () => {
  const err = errorOf(() =>
    validateSale({
      payment_type: "cash",
      items: [
        { product_id: 1, quantity: 0 },
        { product_id: 1, quantity: 1.5 },
        { product_id: "x", quantity: 1 },
        { quantity: -2 },
        "nada",
      ],
    }),
  );
  expect(err).toBeInstanceOf(BadRequestError);
  expect(err.details).toEqual({
    "items[0].quantity": "Debe ser un entero entre 1 y 1.000.000",
    "items[1].quantity": "Debe ser un número entero",
    "items[2].product_id": "Debe ser un número entero",
    "items[3].product_id": "Este campo es obligatorio",
    "items[3].quantity": "Debe ser un entero entre 1 y 1.000.000",
    "items[4]": "Cada línea debe indicar product_id y quantity",
  });
});

test("exige condición de pago y al menos un producto", () => {
  expect(errorOf(() => validateSale({})).details).toEqual({
    payment_type: "Este campo es obligatorio",
    items: "Agrega al menos un producto",
  });
  expect(errorOf(() => validateSale({ payment_type: "tarjeta", items: {} })).details).toEqual({
    payment_type: "Valor no permitido. Opciones: cash, credit",
    items: "Debe ser una lista de productos",
  });
});

test("fiado sin cliente: 400 en customer_id", () => {
  const err = errorOf(() => validateSale({ payment_type: "credit", items: [{ product_id: 1, quantity: 1 }] }));
  expect(err).toBeInstanceOf(BadRequestError);
  expect(err.details).toEqual({ customer_id: "Para vender fiado debes indicar el cliente" });
});

test("la suma agrupada tampoco puede superar el máximo por producto", () => {
  const err = errorOf(() =>
    validateSale({
      payment_type: "cash",
      items: [
        { product_id: 7, quantity: 1_000_000 },
        { product_id: 7, quantity: 1 },
      ],
    }),
  );
  expect(err.details).toEqual({ "products.7": "Como máximo 1.000.000 unidades por producto" });
});
