import { formatDecimalInput, formatInteger } from "../../format";
import type { Invoice, InvoiceItem } from "../../invoices";
import { tableCell as cell, textElement } from "../../list";
import { dualAmountTexts, formatDualSnapshot } from "../../money";
import { detailElements as e } from "./detail-elements";

function nameCell(item: InvoiceItem): HTMLTableCellElement {
  const name = cell("min-w-0");
  name.append(textElement("div", item.product_name, "text-break"));
  if (item.product_code) name.append(textElement("div", item.product_code, "small text-body-secondary"));
  const unitInline = document.createElement("div");
  unitInline.className = "small text-body-secondary d-sm-none amount-cell";
  unitInline.innerHTML = `c/u ${formatDualSnapshot(item.unit_price_usd_cents, item.unit_price_bs_cents)}`;
  name.append(unitInline);
  return name;
}

/** Fila de la tabla de líneas de la factura. */
export function itemRow(item: InvoiceItem): HTMLTableRowElement {
  const row = document.createElement("tr");
  const quantity = cell("text-center amount-cell");
  quantity.textContent = formatInteger(item.quantity);
  const unit = cell("amount-cell d-none d-sm-table-cell");
  unit.innerHTML = formatDualSnapshot(item.unit_price_usd_cents, item.unit_price_bs_cents);
  const total = cell("amount-cell");
  total.innerHTML = formatDualSnapshot(item.line_total_usd_cents, item.line_total_bs_cents);
  row.append(nameCell(item), quantity, unit, total);
  return row;
}

/** Subtotal, IVA y total de la factura. */
export function renderTotals(current: Invoice): void {
  e.subtotalText.innerHTML = formatDualSnapshot(current.subtotal_usd_cents, current.subtotal_bs_cents);
  e.taxRow.classList.toggle("d-none", current.tax_percent <= 0 && current.tax_usd_cents <= 0);
  e.taxLabel.textContent = `IVA (${formatDecimalInput(current.tax_percent)} %)`;
  e.taxText.innerHTML = formatDualSnapshot(current.tax_usd_cents, current.tax_bs_cents);
  const total = dualAmountTexts(current.total_usd_cents, current.total_bs_cents);
  e.totalPrimary.textContent = total.primary;
  e.totalSecondary.textContent = `(${total.secondary})`;
  e.totalPrimary.classList.toggle("text-decoration-line-through", current.status === "void");
}
