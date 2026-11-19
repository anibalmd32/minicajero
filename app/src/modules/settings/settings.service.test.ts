import { expect, test } from "bun:test";
import { detailsOf } from "../../test-support/details-of";
import { getIvaPercent, getLowStockThreshold, getSettings, updateSettings } from "./settings.service";
import { db, useSettingsDatabase, validSettings } from "./settings.test-support";

useSettingsDatabase();

test("valores por defecto: IVA 0, USD como moneda principal y stock bajo en 5", () => {
  expect(getSettings(db())).toEqual({
    business_name: "",
    business_rif: "",
    business_address: "",
    business_phone: "",
    iva_percent: 0,
    display_currency: "USD",
    low_stock_threshold: 5,
  });
});

test("umbral de stock bajo: entero entre 0 y 1.000.000", () => {
  expect(updateSettings({ low_stock_threshold: 0 }, db()).low_stock_threshold).toBe(0);
  expect(getLowStockThreshold(db())).toBe(0);
  expect(updateSettings({ low_stock_threshold: 12 }, db()).low_stock_threshold).toBe(12);
  for (const low_stock_threshold of [-1, 2.5, "3", 1_000_001]) {
    expect(detailsOf(() => updateSettings({ low_stock_threshold }, db()))?.low_stock_threshold).toBeDefined();
  }
  expect(getLowStockThreshold(db())).toBe(12);
});

test("guarda y normaliza la configuración completa", () => {
  const saved = updateSettings(validSettings, db());
  expect(saved).toEqual({ ...validSettings, business_name: "Bodega La Esquina", business_rif: "J-12345678-9" });
  expect(getSettings(db())).toEqual(saved);
  expect(getIvaPercent(db())).toBe(16);
});

test("los campos omitidos conservan su valor y los vacíos se limpian", () => {
  updateSettings(validSettings, db());
  const saved = updateSettings({ display_currency: "USD", business_phone: "", iva_percent: 12.75 }, db());
  expect(saved.business_name).toBe("Bodega La Esquina");
  expect(saved.business_phone).toBe("");
  expect(saved.iva_percent).toBe(12.75);
  expect(saved.display_currency).toBe("USD");
});

test("rechaza datos inválidos con errores por campo sin guardar nada", () => {
  const invalid = {
    business_name: " ",
    business_rif: "X123",
    business_phone: "abc",
    iva_percent: 100.5,
    display_currency: "EUR",
  };
  const details = detailsOf(() => updateSettings(invalid, db()));
  expect(Object.keys(details ?? {}).sort()).toEqual(
    ["business_name", "business_phone", "business_rif", "display_currency", "iva_percent"].sort(),
  );
  expect(getSettings(db()).display_currency).toBe("USD");
});

test("IVA: máximo 2 decimales y debe ser numérico", () => {
  const ivaError = (iva_percent: unknown) =>
    detailsOf(() => updateSettings({ ...validSettings, iva_percent }, db()))?.iva_percent;
  expect(ivaError(16.125)).toContain("decimales");
  expect(ivaError("16")).toBe("Debe ser un número");
  expect(ivaError(-1)).toBeDefined();
});
