import type { Database } from "bun:sqlite";
import { getDb } from "../../db/connection";
import type { JsonObject } from "../../lib/request";
import { Validator } from "../../lib/validation";
import { readSettings, type SettingsMap, writeSettings } from "./settings.repository";

/** Monedas en las que se puede mostrar el monto principal. */
export const DISPLAY_CURRENCIES = ["USD", "VES"] as const;
export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

/** Configuración del negocio tal como la expone la API. */
export interface BusinessSettings {
  business_name: string;
  business_rif: string;
  business_address: string;
  business_phone: string;
  iva_percent: number;
  display_currency: DisplayCurrency;
  low_stock_threshold: number;
}

type SettingsField = keyof BusinessSettings;

const STORAGE_KEYS: Record<SettingsField, string> = {
  business_name: "business_name",
  business_rif: "business_rif",
  business_address: "business_address",
  business_phone: "business_phone",
  iva_percent: "tax_percent",
  display_currency: "display_currency",
  low_stock_threshold: "low_stock_threshold",
};

const SETTINGS_FIELDS = Object.keys(STORAGE_KEYS) as SettingsField[];

const RIF_PATTERN = /^([VEJPG])-?(\d{5,8})-?(\d)$/i;
const RIF_BODY_DIGITS = 8;
const PHONE_PATTERN = /^(?=(?:\D*\d){7})\+?[\d\s().-]{7,20}$/;

/** Umbral de stock bajo por defecto: un producto con esta cantidad o menos se considera con stock bajo. */
export const DEFAULT_LOW_STOCK_THRESHOLD = 5;
const LOW_STOCK_THRESHOLD_MAX = 1_000_000;

function parseIvaPercent(raw: string | undefined): number {
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : 0;
}

function parseLowStockThreshold(raw: string | undefined): number {
  const value = raw !== undefined && /^\d{1,7}$/.test(raw) ? Number(raw) : NaN;
  return value <= LOW_STOCK_THRESHOLD_MAX ? value : DEFAULT_LOW_STOCK_THRESHOLD;
}

function parseDisplayCurrency(raw: string | undefined): DisplayCurrency {
  return DISPLAY_CURRENCIES.find((currency) => currency === raw) ?? "USD";
}

function fromStorage(stored: SettingsMap): BusinessSettings {
  return {
    business_name: stored[STORAGE_KEYS.business_name] ?? "",
    business_rif: stored[STORAGE_KEYS.business_rif] ?? "",
    business_address: stored[STORAGE_KEYS.business_address] ?? "",
    business_phone: stored[STORAGE_KEYS.business_phone] ?? "",
    iva_percent: parseIvaPercent(stored[STORAGE_KEYS.iva_percent]),
    display_currency: parseDisplayCurrency(stored[STORAGE_KEYS.display_currency]),
    low_stock_threshold: parseLowStockThreshold(stored[STORAGE_KEYS.low_stock_threshold]),
  };
}

function toStorage(settings: Partial<BusinessSettings>): SettingsMap {
  const entries = SETTINGS_FIELDS.filter((field) => settings[field] !== undefined).map((field) => [
    STORAGE_KEYS[field],
    String(settings[field]),
  ]);
  return Object.fromEntries(entries);
}

/** Configuración vigente del negocio. */
export function getSettings(db: Database = getDb()): BusinessSettings {
  return fromStorage(readSettings(db));
}

/** Porcentaje de IVA vigente (0-100). */
export function getIvaPercent(db: Database = getDb()): number {
  return getSettings(db).iva_percent;
}

/** Umbral vigente de stock bajo (unidades). */
export function getLowStockThreshold(db: Database = getDb()): number {
  return getSettings(db).low_stock_threshold;
}

/** Normaliza un RIF al formato canónico `L-NNNNNNNN-D` (p. ej. `j1234567-8` -> `J-01234567-8`); si no es un RIF válido lo devuelve sin cambios. */
export function normalizeRif(rif: string): string {
  const match = RIF_PATTERN.exec(rif.trim());
  if (!match) return rif;
  const [, letter = "", body = "", checkDigit = ""] = match;
  return `${letter.toUpperCase()}-${body.padStart(RIF_BODY_DIGITS, "0")}-${checkDigit}`;
}

type FieldValidators = { [K in SettingsField]: (v: Validator) => BusinessSettings[K] };

const FIELD_VALIDATORS: FieldValidators = {
  business_name: (v) => v.requiredString("business_name", { max: 120 }),
  business_rif: (v) => {
    const rif = v.optionalString("business_rif", {
      max: 20,
      pattern: RIF_PATTERN,
      patternMessage: "RIF inválido. Ejemplo: J-12345678-9",
    });
    return rif ? normalizeRif(rif) : "";
  },
  business_address: (v) => v.optionalString("business_address", { max: 250 }) ?? "",
  business_phone: (v) =>
    v.optionalString("business_phone", {
      max: 20,
      pattern: PHONE_PATTERN,
      patternMessage: "Teléfono inválido (mínimo 7 dígitos). Ejemplo: 0412-1234567",
    }) ?? "",
  iva_percent: (v) => v.nonNegativeNumber("iva_percent", { max: 100, maxDecimals: 2 }),
  display_currency: (v) => v.oneOf("display_currency", DISPLAY_CURRENCIES),
  low_stock_threshold: (v) => v.integer("low_stock_threshold", { min: 0, max: LOW_STOCK_THRESHOLD_MAX }),
};

function validateChanges(changes: JsonObject): Partial<BusinessSettings> {
  const v = new Validator(changes);
  const validated: Partial<Record<SettingsField, unknown>> = {};
  for (const field of SETTINGS_FIELDS) {
    if (field in changes) validated[field] = FIELD_VALIDATORS[field](v);
  }
  v.assertValid("Revisa los datos de la configuración");
  return validated as Partial<BusinessSettings>;
}

/**
 * Actualiza la configuración de forma parcial: solo se validan y guardan los campos presentes
 * en el cuerpo; los ausentes conservan su valor actual. Devuelve la configuración resultante.
 */
export function updateSettings(changes: JsonObject, db: Database = getDb()): BusinessSettings {
  writeSettings(toStorage(validateChanges(changes)), db);
  return getSettings(db);
}
