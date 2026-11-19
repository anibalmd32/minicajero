import { expect, test } from "bun:test";
import { detailsOf } from "../../test-support/details-of";
import { normalizePhone } from "./customer-phone";
import { validateCustomer } from "./customer-validation";
import { juan } from "./customers.test-support";

const rif = (doc_number: string) => validateCustomer({ ...juan, doc_type: "J", doc_number }).doc_number;

test("validateCustomer normaliza nombres, documento y teléfono", () => {
  expect(validateCustomer({ ...juan, phone: "+58 (412) 123-4567" })).toEqual({
    first_name: "Juan Carlos",
    last_name: "Pérez",
    doc_type: "V",
    doc_number: "12345678",
    phone: "04121234567",
  });
});

test("validateCustomer acepta RIF con guiones, prefijo y dígito verificador", () => {
  const data = validateCustomer({ ...juan, doc_type: "j", doc_number: "J-01234567-8" });
  expect(data.doc_type).toBe("J");
  expect(data.doc_number).toBe("012345678");
  expect(rif("J-1234567-8")).toBe("012345678");
  expect(rif("012345678")).toBe("012345678");
  expect(rif("J 41.234.567 8")).toBe("412345678");
  expect(rif("J-41234567-8")).not.toBe(rif("J-04123456-8"));
});

test("validateCustomer exige el dígito verificador del RIF", () => {
  for (const doc_number of ["J-12345678", "12.345.678", "J-412345678-9", "0-0"]) {
    const details = detailsOf(() => validateCustomer({ ...juan, doc_type: "J", doc_number }));
    expect(details?.doc_number).toContain("verificador");
  }
});

test("validateCustomer acepta número de documento numérico", () => {
  expect(validateCustomer({ ...juan, doc_number: 24555666 }).doc_number).toBe("24555666");
});

test("validateCustomer informa los errores por campo", () => {
  expect(detailsOf(() => validateCustomer({}))).toEqual({
    first_name: "Este campo es obligatorio",
    last_name: "Este campo es obligatorio",
    doc_type: "Este campo es obligatorio",
    doc_number: "Este campo es obligatorio",
  });
  const details = detailsOf(() =>
    validateCustomer({ first_name: "123", last_name: "x".repeat(61), doc_type: "P", doc_number: "12a", phone: "12" }),
  );
  expect(Object.keys(details ?? {}).sort()).toEqual(["doc_number", "doc_type", "first_name", "last_name", "phone"]);
});

test("validateCustomer rechaza longitudes y prefijos de documento inválidos", () => {
  const docError = (doc_number: string) => detailsOf(() => validateCustomer({ ...juan, doc_number }))?.doc_number;
  expect(docError("1234")).toContain("entre 5 y 10");
  expect(docError("12345678901")).toContain("entre 5 y 10");
  expect(docError("E-12345678")).toContain("prefijo");
});

test("normalizePhone admite formatos venezolanos e internacionales", () => {
  expect(normalizePhone("0412-1234567")).toBe("04121234567");
  expect(normalizePhone("412 123 4567")).toBe("04121234567");
  expect(normalizePhone("+58 212 5551234")).toBe("02125551234");
  expect(normalizePhone("+1 (305) 555-0100")).toBe("+13055550100");
});
