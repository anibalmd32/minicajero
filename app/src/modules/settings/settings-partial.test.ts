import { expect, test } from "bun:test";
import { detailsOf } from "../../test-support/details-of";
import { getSettings, updateSettings } from "./settings.service";
import { db, useSettingsDatabase } from "./settings.test-support";

useSettingsDatabase();

test("en una BD nueva se puede cambiar solo la moneda o el IVA sin nombre del negocio", () => {
  expect(updateSettings({ display_currency: "VES" }, db()).display_currency).toBe("VES");
  expect(updateSettings({ iva_percent: 16 }, db()).iva_percent).toBe(16);
  expect(getSettings(db())).toMatchObject({ business_name: "", display_currency: "VES", iva_percent: 16 });
});

test("solo se validan los campos enviados", () => {
  const details = detailsOf(() => updateSettings({ iva_percent: -1 }, db()));
  expect(Object.keys(details ?? {})).toEqual(["iva_percent"]);
  expect(detailsOf(() => updateSettings({ business_name: "" }, db()))?.business_name).toBe("Este campo es obligatorio");
  expect(detailsOf(() => updateSettings({ display_currency: null }, db()))?.display_currency).toBeDefined();
});

test("normaliza el RIF al formato L-NNNNNNNN-D", () => {
  for (const rif of ["j123456789", "J-123456789", "J12345678-9", "j-12345678-9"]) {
    expect(updateSettings({ business_rif: rif }, db()).business_rif).toBe("J-12345678-9");
  }
  expect(updateSettings({ business_rif: "v-5123456-7" }, db()).business_rif).toBe("V-05123456-7");
});

test("rechaza RIF sin dígito verificador o con demasiados dígitos", () => {
  expect(detailsOf(() => updateSettings({ business_rif: "J-1234" }, db()))?.business_rif).toBeDefined();
  expect(detailsOf(() => updateSettings({ business_rif: "J-1234567890" }, db()))?.business_rif).toBeDefined();
});

test("el teléfono exige al menos 7 dígitos", () => {
  const phoneError = (business_phone: string) =>
    detailsOf(() => updateSettings({ business_phone }, db()))?.business_phone;
  expect(phoneError("((((((((")).toBeDefined();
  expect(phoneError("12-34-56")).toBeDefined();
  expect(updateSettings({ business_phone: "+58 (412) 123.45.67" }, db()).business_phone).toBe("+58 (412) 123.45.67");
});
