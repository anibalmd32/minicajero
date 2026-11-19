import { type Customer, customerFullName, formatPhone } from "../../customers";
import { tableCell as cell, textElement } from "../../list";
import { formatDual } from "../../money";
import { customerStatementUrl } from "../../payments";

/** Acción de fila que maneja la página: editar o eliminar. */
export type CustomerAction = "edit" | "delete";

const ACTION_CLASSES: Record<CustomerAction, string> = {
  edit: "btn btn-sm btn-outline-primary",
  delete: "btn btn-sm btn-outline-danger",
};

const COMPACT_ACTION_CLASSES: Record<CustomerAction, string> = {
  edit: "btn btn-link btn-sm p-0 text-decoration-none",
  delete: "btn btn-link btn-sm p-0 link-danger text-decoration-none",
};

function actionButton(action: CustomerAction, customer: Customer, compact = false): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = (compact ? COMPACT_ACTION_CLASSES : ACTION_CLASSES)[action];
  button.dataset.action = action;
  button.dataset.id = String(customer.id);
  button.textContent = action === "edit" ? "Editar" : "Eliminar";
  button.setAttribute("aria-label", `${button.textContent} a ${customerFullName(customer)}`);
  return button;
}

function statementLink(customer: Customer, compact = false): HTMLAnchorElement {
  const link = document.createElement("a");
  link.href = customerStatementUrl(customer.id);
  link.className = compact ? "btn btn-link btn-sm p-0 text-decoration-none" : "btn btn-sm btn-outline-secondary";
  link.textContent = "Estado de cuenta";
  link.setAttribute("aria-label", `Estado de cuenta de ${customerFullName(customer)}`);
  return link;
}

function compactMeta(customer: Customer): HTMLDivElement {
  const meta = document.createElement("div");
  meta.className = "small text-body-secondary d-lg-none customer-meta";
  meta.append(textElement("span", customer.document, "d-md-none text-nowrap"));
  const phone = formatPhone(customer.phone);
  if (phone) meta.append(textElement("span", phone, "text-nowrap"));
  return meta;
}

function compactActions(customer: Customer): HTMLDivElement {
  const actions = document.createElement("div");
  actions.className = "row-actions-compact d-sm-none";
  actions.append(
    statementLink(customer, true),
    actionButton("edit", customer, true),
    actionButton("delete", customer, true),
  );
  return actions;
}

function nameCell(customer: Customer): HTMLTableCellElement {
  const td = cell("customer-name-cell");
  td.append(textElement("div", customerFullName(customer), "fw-semibold text-break"));
  td.append(compactMeta(customer), compactActions(customer));
  return td;
}

function balanceCell(customer: Customer): HTMLTableCellElement {
  const owes = customer.balance_usd_cents > 0;
  const td = cell("amount-cell");
  const amount = document.createElement("a");
  amount.href = customerStatementUrl(customer.id);
  amount.className = `balance-link ${owes ? "link-danger fw-semibold" : "link-secondary"}`;
  amount.innerHTML = formatDual(customer.balance_usd_cents);
  amount.title = "Ver estado de cuenta";
  amount.setAttribute("aria-label", `Estado de cuenta de ${customerFullName(customer)}`);
  td.append(amount);
  if (owes) td.dataset.owes = "true";
  return td;
}

function actionsCell(customer: Customer): HTMLTableCellElement {
  const td = cell("text-end d-none d-sm-table-cell row-actions-cell");
  const group = document.createElement("div");
  group.className = "row-actions";
  group.append(statementLink(customer), actionButton("edit", customer), actionButton("delete", customer));
  td.append(group);
  return td;
}

/** Fila del listado: documento, nombre (con datos y acciones compactas en móvil), teléfono, saldo y acciones. */
export function customerRow(customer: Customer): HTMLTableRowElement {
  const row = document.createElement("tr");
  const documentCell = cell("d-none d-md-table-cell text-nowrap");
  documentCell.textContent = customer.document;
  const phoneCell = cell("d-none d-lg-table-cell text-nowrap");
  phoneCell.textContent = formatPhone(customer.phone) || "—";
  row.append(documentCell, nameCell(customer), phoneCell, balanceCell(customer), actionsCell(customer));
  return row;
}
