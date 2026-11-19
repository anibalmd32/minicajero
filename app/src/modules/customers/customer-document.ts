import type { Validator } from "../../lib/validation";
import { DOC_TYPES, type DocType } from "./customers.types";
import { onlyDigits, withoutLeadingZeros } from "./digits";

const DOC_DIGITS_MIN = 5;
const DOC_DIGITS_MAX = 10;
const DOC_INPUT_MAX_LENGTH = 30;
const DOC_NUMBER_PATTERN = /^(?:([VEJ])\s*-?\s*)?(\d[\d.\-\s]*)$/i;
const RIF_BODY_DIGITS = 8;
const RIF_DIGITS = RIF_BODY_DIGITS + 1;
const RIF_FORMAT_MESSAGE = "El RIF debe tener hasta 8 dígitos y el dígito verificador. Ejemplo: J-12345678-9";
const DOC_SEPARATORS = /[.\-\s]+/;

interface ParsedDocNumber {
  prefix: DocType | null;
  body: string;
}

/** Formato de presentación del documento: cédula `V-12345678`, RIF `J-01234567-8`. */
export function formatDocument(docType: DocType, docNumber: string): string {
  if (docType === "J" && docNumber.length === RIF_DIGITS) {
    return `J-${docNumber.slice(0, RIF_BODY_DIGITS)}-${docNumber.slice(RIF_BODY_DIGITS)}`;
  }
  return `${docType}-${docNumber}`;
}

function isDocType(value: unknown): value is DocType {
  return (DOC_TYPES as readonly unknown[]).includes(value);
}

function normalizeCedula(v: Validator, body: string): string | null {
  const digits = withoutLeadingZeros(onlyDigits(body));
  if (digits.length < DOC_DIGITS_MIN || digits.length > DOC_DIGITS_MAX) {
    v.addError("doc_number", `Debe tener entre ${DOC_DIGITS_MIN} y ${DOC_DIGITS_MAX} dígitos`);
    return null;
  }
  return digits;
}

function splitRif(body: string): { number: string; checkDigit: string } | null {
  const groups = body.split(DOC_SEPARATORS).filter((group) => group !== "");
  const last = groups.at(-1) ?? "";
  if (groups.length > 1 && last.length === 1) return { number: groups.slice(0, -1).join(""), checkDigit: last };
  const digits = groups.join("");
  if (digits.length !== RIF_DIGITS) return null;
  return { number: digits.slice(0, RIF_BODY_DIGITS), checkDigit: digits.slice(RIF_BODY_DIGITS) };
}

function normalizeRif(v: Validator, body: string): string | null {
  const parts = splitRif(body);
  const number = parts ? withoutLeadingZeros(parts.number) : "";
  if (!parts || number === "0" || number.length > RIF_BODY_DIGITS) {
    v.addError("doc_number", RIF_FORMAT_MESSAGE);
    return null;
  }
  return number.padStart(RIF_BODY_DIGITS, "0") + parts.checkDigit;
}

function isBlank(text: unknown): boolean {
  return text === undefined || text === null || (typeof text === "string" && text.trim() === "");
}

function readDocNumber(v: Validator, raw: unknown): ParsedDocNumber | null {
  const text = typeof raw === "number" && Number.isSafeInteger(raw) && raw >= 0 ? String(raw) : raw;
  if (isBlank(text)) {
    v.addError("doc_number", "Este campo es obligatorio");
    return null;
  }
  const match =
    typeof text === "string" && text.length <= DOC_INPUT_MAX_LENGTH ? DOC_NUMBER_PATTERN.exec(text.trim()) : null;
  if (!match) {
    v.addError("doc_number", "Solo se admiten dígitos (puede incluir guiones o puntos). Ejemplo: 12345678");
    return null;
  }
  const [, prefix, body = ""] = match;
  return { prefix: prefix ? (prefix.toUpperCase() as DocType) : null, body };
}

/**
 * Lee y normaliza el número de documento: la cédula (V/E) queda en dígitos sin ceros a la izquierda
 * (`V-012.345.678` -> `12345678`) y el RIF (J) en sus 9 dígitos canónicos (`J-1234567-8` -> `012345678`).
 * Registra el error en el validador y devuelve `""` si no es válido.
 */
export function readNormalizedDocNumber(v: Validator, rawDocType: unknown, rawDocNumber: unknown): string {
  const docNumber = readDocNumber(v, rawDocNumber);
  if (!docNumber) return "";
  const docType = isDocType(rawDocType) ? rawDocType : docNumber.prefix;
  if (docNumber.prefix && docType !== docNumber.prefix) {
    v.addError("doc_number", `El prefijo ${docNumber.prefix} no coincide con el tipo de documento ${docType}`);
    return "";
  }
  return (docType === "J" ? normalizeRif(v, docNumber.body) : normalizeCedula(v, docNumber.body)) ?? "";
}
