import { dualAmountTexts, formatDual, formatDualSnapshot } from "../../money";

export function dualHtml(usdCents: number, bsCents: number | null): string {
  return bsCents === null ? formatDual(usdCents) : formatDualSnapshot(usdCents, bsCents);
}

export function amountText(usdCents: number, bsCents: number | null): string {
  const texts = dualAmountTexts(usdCents, bsCents);
  return `${texts.primary} (${texts.secondary})`;
}
