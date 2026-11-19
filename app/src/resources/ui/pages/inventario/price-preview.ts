import { AMOUNT_DECIMALS, PRODUCT_PRICE_MAX_USD, toCents } from "../../../../lib/money";
import { countDecimals } from "../../../../lib/validation";
import { formatBs, formatRate, formatUsd, isAmbiguousThousands, parseDecimalInput } from "../../format";
import { textElement } from "../../list";
import { getCurrentRate, usdCentsToBs } from "../../money";
import { RATE_SETTINGS_URL } from "../../nav-status";
import { elements } from "./elements";

export const PRICE_DECIMALS_HINT =
  "Usa coma para los decimales: escribe 1.050,00 para mil cincuenta o 1,05 para uno con cinco.";

function rateLink(): HTMLAnchorElement {
  const link = document.createElement("a");
  link.href = RATE_SETTINGS_URL;
  link.textContent = "Fijar tasa";
  return link;
}

export function previewMessage(text: string): void {
  elements.pricePreview.classList.remove("text-danger");
  elements.pricePreview.replaceChildren(text);
}

function priceProblem(text: string, price: number): string | null {
  if (isAmbiguousThousands(text)) return PRICE_DECIMALS_HINT;
  if (Number.isNaN(price) || price < 0) return "Escribe un monto válido, por ejemplo 12,50.";
  if (countDecimals(price) > AMOUNT_DECIMALS) return `Usa como máximo ${AMOUNT_DECIMALS} decimales, por ejemplo 12,55.`;
  if (price > PRODUCT_PRICE_MAX_USD) return `El precio máximo es ${formatUsd(toCents(PRODUCT_PRICE_MAX_USD))}.`;
  return null;
}

function renderEquivalent(price: number): void {
  const rate = getCurrentRate();
  const bsCents = usdCentsToBs(toCents(price));
  if (rate === null || bsCents === null) {
    previewMessage("Sin tasa vigente: no se puede calcular el equivalente en Bs. ");
    elements.pricePreview.append(rateLink());
    return;
  }
  elements.pricePreview.classList.remove("text-danger");
  elements.pricePreview.replaceChildren(
    "Equivale a ",
    textElement("strong", formatBs(bsCents), "text-body text-nowrap"),
    ` (tasa Bs ${formatRate(rate)} por $)`,
  );
}

export function renderPricePreview(): void {
  const text = elements.priceInput.value.trim();
  const parsed = parseDecimalInput(text);
  if (parsed === null) {
    previewMessage("Se guarda en dólares; en bolívares se calcula con la tasa vigente.");
    return;
  }
  const problem = priceProblem(text, parsed);
  if (problem !== null) {
    previewMessage(problem);
    elements.pricePreview.classList.add("text-danger");
    return;
  }
  renderEquivalent(parsed);
}
