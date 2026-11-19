/**
 * Utilidades de dinero. Regla del proyecto: los montos se guardan como enteros en
 * centavos (USD) o céntimos (Bs); la tasa Bs/USD es un número con hasta 4 decimales.
 * Todo el redondeo es "half away from zero" (0,5 -> 1; -0,5 -> -1).
 */

/** Decimales admitidos en la tasa de cambio. */
export const RATE_DECIMALS = 4;
const RATE_SCALE = 10n ** BigInt(RATE_DECIMALS);

/** Decimales admitidos en un monto (centavos o céntimos). */
export const AMOUNT_DECIMALS = 2;

/** Precio máximo de un producto en USD (lo valida el servidor y la UI lo usa para avisar antes de guardar). */
export const PRODUCT_PRICE_MAX_USD = 1_000_000;

/** Redondea `value` a `decimals` decimales desplazando la coma en notación exponencial, sin errores de coma flotante (1.005 -> 1.01). */
export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) throw new RangeError(`Valor no finito: ${value}`);
  const sign = value < 0 ? -1 : 1;
  const shifted = Math.round(shift(Math.abs(value), decimals));
  return sign * shift(shifted, -decimals) || 0;
}

/** Monto decimal (p. ej. 10.5) -> centavos enteros (1050). */
export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) throw new RangeError(`Monto no finito: ${amount}`);
  const sign = amount < 0 ? -1 : 1;
  const cents = Math.round(shift(Math.abs(amount), 2));
  if (!Number.isSafeInteger(cents)) throw new RangeError(`Monto fuera de rango: ${amount}`);
  return sign * cents || 0;
}

/** Centavos enteros (1050) -> monto decimal (10.5). */
export function fromCents(cents: number): number {
  assertCents(cents);
  return cents / 100;
}

/** Normaliza una tasa a 4 decimales y valida que sea > 0. */
export function normalizeRate(rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0) throw new RangeError(`Tasa inválida: ${rate}`);
  const rounded = roundTo(rate, RATE_DECIMALS);
  if (rounded <= 0) throw new RangeError(`Tasa inválida: ${rate}`);
  return rounded;
}

/** Centavos USD -> céntimos Bs con la tasa dada (Bs por USD). Cálculo exacto con BigInt. */
export function usdToBs(usdCents: number, rate: number): number {
  assertCents(usdCents);
  const scaledRate = toScaledRate(rate);
  return bigToNumber(divRound(BigInt(usdCents) * scaledRate, RATE_SCALE));
}

/** Céntimos Bs -> centavos USD con la tasa dada (Bs por USD). Cálculo exacto con BigInt. */
export function bsToUsd(bsCents: number, rate: number): number {
  assertCents(bsCents);
  const scaledRate = toScaledRate(rate);
  return bigToNumber(divRound(BigInt(bsCents) * RATE_SCALE, scaledRate));
}

function toScaledRate(rate: number): bigint {
  const normalized = normalizeRate(rate);
  return BigInt(Math.round(shift(normalized, RATE_DECIMALS)));
}

/** División entera con redondeo half away from zero (divisor > 0). */
function divRound(numerator: bigint, divisor: bigint): bigint {
  const negative = numerator < 0n;
  const abs = negative ? -numerator : numerator;
  const q = (abs * 2n + divisor) / (divisor * 2n);
  return negative ? -q : q;
}

function bigToNumber(value: bigint): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n)) throw new RangeError(`Monto fuera de rango: ${value}`);
  return n;
}

function assertCents(cents: number): void {
  if (!Number.isSafeInteger(cents)) throw new RangeError(`Se esperaba un entero en centavos: ${cents}`);
}

/** Multiplica por 10^n operando sobre la representación decimal (sin ruido binario). */
function shift(value: number, n: number): number {
  const [mantissa, exponent = "0"] = String(value).split("e");
  return Number(`${mantissa}e${Number(exponent) + n}`);
}

/** Decimales admitidos en un porcentaje (p. ej. el IVA 16,25 %). */
export const PERCENT_DECIMALS = 2;
const PERCENT_SCALE = 100n * 10n ** BigInt(PERCENT_DECIMALS);

/**
 * `percent` % de un monto en centavos o céntimos, redondeado al entero más cercano (half away from zero).
 * Exacto con BigInt: `percentOf(1005, 16)` = 160,8 -> 161. El porcentaje admite hasta 2 decimales.
 */
export function percentOf(cents: number, percent: number): number {
  assertCents(cents);
  if (!Number.isFinite(percent) || percent < 0) throw new RangeError(`Porcentaje inválido: ${percent}`);
  const scaledPercent = BigInt(Math.round(shift(roundTo(percent, PERCENT_DECIMALS), PERCENT_DECIMALS)));
  return bigToNumber(divRound(BigInt(cents) * scaledPercent, PERCENT_SCALE));
}
