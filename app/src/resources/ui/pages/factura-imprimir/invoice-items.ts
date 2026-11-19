import { formatInteger } from "../../format";
import type { InvoiceItem } from "../../invoices";
import { textElement } from "../../list";
import { formatDualSnapshot } from "../../money";

function amountCell(usdCents: number, bsCents: number, className: string): HTMLTableCellElement {
  const cell = document.createElement("td");
  cell.className = className;
  cell.innerHTML = formatDualSnapshot(usdCents, bsCents);
  return cell;
}

function descriptionCell(item: InvoiceItem): HTMLTableCellElement {
  const description = document.createElement("td");
  description.className = "col-desc";
  description.append(textElement("span", item.product_name, "sheet-item-name"));
  if (item.product_code) description.append(textElement("span", `Cód. ${item.product_code}`, "sheet-item-code"));
  const unitInline = document.createElement("span");
  unitInline.className = "sheet-item-unit";
  unitInline.innerHTML = `${formatInteger(item.quantity)} × ${formatDualSnapshot(item.unit_price_usd_cents, item.unit_price_bs_cents)}`;
  description.append(unitInline);
  return description;
}

/** Fila de la tabla de líneas de la hoja. */
export function itemRow(item: InvoiceItem): HTMLTableRowElement {
  const row = document.createElement("tr");
  row.append(
    textElement("td", formatInteger(item.quantity), "col-qty"),
    descriptionCell(item),
    amountCell(item.unit_price_usd_cents, item.unit_price_bs_cents, "col-unit"),
    amountCell(item.line_total_usd_cents, item.line_total_bs_cents, "col-amount"),
  );
  return row;
}
