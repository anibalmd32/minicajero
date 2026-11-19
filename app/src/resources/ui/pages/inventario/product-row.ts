import { formatInteger } from "../../format";
import { tableCell, textElement } from "../../list";
import { formatDual } from "../../money";
import { type Product, productLabel } from "../../products";
import { lowStockRule } from "./empty-state";
import { actionButton } from "./product-actions";

function codeCell(product: Product): HTMLTableCellElement {
  const td = tableCell("d-none d-md-table-cell product-code");
  td.textContent = product.code ?? "—";
  if (!product.code) td.classList.add("text-body-secondary");
  return td;
}

function compactActions(product: Product): HTMLElement {
  const actions = document.createElement("div");
  actions.className = "row-actions-compact d-lg-none";
  const toggle = actionButton("toggle", product, true);
  toggle.classList.add("d-sm-none");
  actions.append(
    actionButton("edit", product, true),
    actionButton("stock", product, true),
    toggle,
    actionButton("delete", product, true),
  );
  return actions;
}

function nameMeta(product: Product): HTMLElement {
  const meta = document.createElement("div");
  meta.className = "small text-body-secondary d-md-none product-meta";
  if (product.code) meta.append(textElement("span", product.code, "product-code"));
  if (!product.active) meta.append(textElement("span", "Inactivo", "badge text-bg-secondary d-sm-none"));
  return meta;
}

function nameCell(product: Product): HTMLTableCellElement {
  const td = tableCell("product-name-cell");
  td.append(textElement("div", product.name, "fw-semibold text-break product-name"));
  const meta = nameMeta(product);
  const inlinePrice = document.createElement("div");
  inlinePrice.className = "product-price-inline amount-cell d-sm-none";
  inlinePrice.innerHTML = formatDual(product.price_usd_cents);
  if (meta.childElementCount > 0) td.append(meta);
  td.append(inlinePrice, compactActions(product));
  return td;
}

function priceCell(product: Product): HTMLTableCellElement {
  const td = tableCell("amount-cell d-none d-sm-table-cell");
  td.innerHTML = formatDual(product.price_usd_cents);
  return td;
}

interface StockBadge {
  className: string;
  status: string;
}

function stockBadge(product: Product): StockBadge | null {
  if (product.stock === 0) return { className: "badge text-bg-danger", status: "Sin stock" };
  if (product.low_stock) return { className: "badge text-bg-warning", status: `Stock bajo (${lowStockRule()})` };
  return null;
}

function stockCell(product: Product): HTMLTableCellElement {
  const td = tableCell("text-center product-stock");
  const badge = stockBadge(product);
  const value = textElement("span", formatInteger(product.stock), badge?.className ?? "fw-semibold");
  if (badge) {
    value.title = badge.status;
    value.append(textElement("span", `: ${badge.status}`, "visually-hidden"));
  }
  td.append(value);
  return td;
}

function activeSwitch(product: Product): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = "form-check-input";
  input.id = `product-active-${product.id}`;
  input.setAttribute("role", "switch");
  input.checked = product.active;
  input.dataset.action = "toggle";
  input.dataset.id = String(product.id);
  input.setAttribute("aria-label", `Producto activo: ${productLabel(product)}`);
  return input;
}

function statusCell(product: Product): HTMLTableCellElement {
  const td = tableCell("d-none d-sm-table-cell");
  const wrapper = document.createElement("div");
  wrapper.className = "form-check form-switch mb-0 text-nowrap";
  const input = activeSwitch(product);
  const label = document.createElement("label");
  label.className = `form-check-label small ${product.active ? "" : "text-body-secondary"}`.trim();
  label.htmlFor = input.id;
  label.textContent = product.active ? "Activo" : "Inactivo";
  wrapper.append(input, label);
  td.append(wrapper);
  return td;
}

function actionsCell(product: Product): HTMLTableCellElement {
  const td = tableCell("text-end d-none d-lg-table-cell row-actions-cell");
  const group = document.createElement("div");
  group.className = "row-actions";
  group.append(actionButton("edit", product), actionButton("stock", product), actionButton("delete", product));
  td.append(group);
  return td;
}

export function productRow(product: Product): HTMLTableRowElement {
  const row = document.createElement("tr");
  row.dataset.id = String(product.id);
  if (!product.active) row.classList.add("product-inactive");
  row.append(
    codeCell(product),
    nameCell(product),
    priceCell(product),
    stockCell(product),
    statusCell(product),
    actionsCell(product),
  );
  return row;
}
