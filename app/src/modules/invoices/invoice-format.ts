import { fromCents } from "../../lib/money";
import type { DisplayCurrency } from "../settings/settings.service";

const amountFormat = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: "always",
});

export const countFormat = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 0, useGrouping: "always" });

export const rateFormat = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
  useGrouping: "always",
});

/** Ambos montos con la moneda principal primero y la otra entre paréntesis: `$ 1,00 (Bs 36,54)`. */
export function formatDualAmount(usdCents: number, bsCents: number, primary: DisplayCurrency): string {
  const usd = `$ ${amountFormat.format(fromCents(usdCents))}`;
  const bs = `Bs ${amountFormat.format(fromCents(bsCents))}`;
  return primary === "VES" ? `${bs} (${usd})` : `${usd} (${bs})`;
}

export function formatUsdAmount(usdCents: number): string {
  return `$ ${amountFormat.format(fromCents(usdCents))}`;
}

export function units(count: number): string {
  return count === 1 ? "1 unidad" : `${countFormat.format(count)} unidades`;
}

export function productKey(productId: number): string {
  return `products.${productId}`;
}

export function priceKey(productId: number): string {
  return `prices.${productId}`;
}
