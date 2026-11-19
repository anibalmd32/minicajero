import type { Validator } from "../../lib/validation";
import { onlyDigits } from "./digits";

const PHONE_PATTERN = /^\+?[\d\s().-]+$/;
const PHONE_DIGITS_MIN = 7;
const PHONE_DIGITS_MAX = 15;
const PHONE_MAX_LENGTH = 25;
const VE_COUNTRY_CODE = "58";
const VE_LOCAL_DIGITS = 10;

/**
 * Normaliza un teléfono: quita separadores y convierte los números venezolanos a formato local
 * (`+58 412-1234567` y `4121234567` -> `04121234567`); los internacionales conservan el `+`.
 */
export function normalizePhone(phone: string): string {
  const digits = onlyDigits(phone);
  const isInternational = phone.trim().startsWith("+") || digits.length > VE_LOCAL_DIGITS + 1;
  if (isInternational) {
    const isVenezuelan =
      digits.startsWith(VE_COUNTRY_CODE) && digits.length === VE_COUNTRY_CODE.length + VE_LOCAL_DIGITS;
    return isVenezuelan ? `0${digits.slice(VE_COUNTRY_CODE.length)}` : `+${digits}`;
  }
  return digits.length === VE_LOCAL_DIGITS && !digits.startsWith("0") ? `0${digits}` : digits;
}

/** Lee el teléfono opcional del cliente, valida su cantidad de dígitos y lo normaliza. */
export function readPhone(v: Validator): string | null {
  const phone = v.optionalString("phone", {
    max: PHONE_MAX_LENGTH,
    pattern: PHONE_PATTERN,
    patternMessage: "Teléfono inválido. Ejemplo: 0412-1234567",
  });
  if (phone === null) return null;
  const digitCount = onlyDigits(phone).length;
  if (digitCount < PHONE_DIGITS_MIN || digitCount > PHONE_DIGITS_MAX) {
    v.addError("phone", `Debe tener entre ${PHONE_DIGITS_MIN} y ${PHONE_DIGITS_MAX} dígitos`);
    return null;
  }
  return normalizePhone(phone);
}
