import type { DashboardDebtor } from "../../dashboard";
import { formatDate } from "../../format";
import { textElement } from "../../list";
import { formatDual } from "../../money";
import { plural } from "./dashboard-text";
import { elements } from "./elements";

function debtorItem(debtor: DashboardDebtor): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "list-group-item dashboard-debtor";
  const info = document.createElement("div");
  info.className = "min-w-0";
  const link = textElement(
    "a",
    debtor.name,
    "fw-semibold text-decoration-none stretched-link dashboard-debtor-name",
  ) as HTMLAnchorElement;
  link.href = `/clientes/${debtor.id}`;
  const meta = `${debtor.document} · ${plural(debtor.pending_invoices, "factura", "facturas")} · desde ${formatDate(debtor.oldest_pending_at)}`;
  info.append(link, textElement("div", meta, "small text-body-secondary"));
  const amount = document.createElement("div");
  amount.className = "amount-cell text-end fw-semibold dashboard-debtor-amount";
  amount.innerHTML = formatDual(debtor.balance_usd_cents);
  li.append(info, amount);
  return li;
}

export function renderDebtors(debtors: readonly DashboardDebtor[]): void {
  elements.debtorsEmpty.classList.toggle("d-none", debtors.length > 0);
  elements.debtorsList.classList.toggle("d-none", debtors.length === 0);
  elements.debtorsList.replaceChildren(...debtors.map(debtorItem));
}
