import { loadRateOverview } from "../../exchange-rate";
import { formatDecimalInput, formatRate, formatUsd } from "../../format";
import { getCurrentRate } from "../../money";
import { renderCart } from "./cart-render";
import type { SaleBasis } from "./constants";
import { refreshCartProducts, refreshCustomer, refreshSettings } from "./refresh-cart";
import { lineMarks, state } from "./state";

function captureBasis(): SaleBasis {
  return {
    prices: new Map(state.cart.lines.map((line) => [line.product_id, line.price_usd_cents])),
    rate: getCurrentRate(),
    ivaPercent: state.ivaPercent,
  };
}

function priceChanges(before: SaleBasis): string[] {
  const changes: string[] = [];
  for (const line of state.cart.lines) {
    const previous = before.prices.get(line.product_id);
    if (previous === undefined || previous === line.price_usd_cents) continue;
    const change = `antes ${formatUsd(previous)}, ahora ${formatUsd(line.price_usd_cents)}`;
    lineMarks.lineNotices.set(line.product_id, `El precio cambió: ${change}.`);
    changes.push(`${line.name}: ${change} c/u`);
  }
  return changes;
}

function basisChanges(before: SaleBasis): string[] {
  const changes = priceChanges(before);
  const rate = getCurrentRate();
  const { ivaPercent } = state;
  if (before.rate !== null && rate !== null && before.rate !== rate) {
    changes.push(`Tasa: antes Bs ${formatRate(before.rate)}, ahora Bs ${formatRate(rate)} por $`);
  }
  if (before.ivaPercent !== null && ivaPercent !== null && before.ivaPercent !== ivaPercent) {
    changes.push(`IVA: antes ${formatDecimalInput(before.ivaPercent)} %, ahora ${formatDecimalInput(ivaPercent)} %`);
  }
  return changes;
}

export async function refreshSaleData(): Promise<string[]> {
  const before = captureBasis();
  await Promise.all([
    refreshSettings(),
    refreshCartProducts(),
    refreshCustomer(),
    loadRateOverview().catch(() => undefined),
  ]);
  const changes = basisChanges(before);
  renderCart();
  return changes;
}
