import { textElement } from "../../list";
import { formatDual } from "../../money";
import { type CartLine, lineTotalUsd, maxQuantity } from "../../sale-cart";
import { cartElements } from "./cart-elements";
import { STATUS_CLASSES } from "./constants";
import { lineHasError, lineMessage } from "./line-state";
import { lineMarks } from "./state";

const LINE_TEMPLATE = `
  <div class="pos-line-grid">
    <div class="pos-line-name" data-role="name"></div>
    <div class="pos-line-unit" data-role="unit"></div>
    <button type="button" class="pos-line-remove" data-action="remove">Quitar</button>
    <div class="input-group input-group-sm pos-qty">
      <button type="button" class="btn btn-outline-secondary" data-action="decrease">−</button>
      <input type="text" class="form-control text-center" data-action="quantity" inputmode="numeric" maxlength="7" autocomplete="off">
      <button type="button" class="btn btn-outline-secondary" data-action="increase">+</button>
    </div>
    <div class="amount-cell pos-line-total" data-role="total"></div>
  </div>
  <div class="small mt-1 d-none" data-role="message"></div>`;

function linePart<T extends HTMLElement>(item: HTMLElement, selector: string): T {
  const part = item.querySelector<T>(selector);
  if (!part) throw new Error(`Falta ${selector} en la línea del carrito`);
  return part;
}

export function lineItem(productId: number): HTMLElement | null {
  return cartElements.cartLines.querySelector<HTMLElement>(`.pos-line[data-id="${productId}"]`);
}

function renderUnitInfo(target: HTMLElement, line: CartLine): void {
  const price = document.createElement("span");
  price.innerHTML = `${formatDual(line.price_usd_cents)} c/u`;
  const parts: (string | Node)[] = [price];
  if (line.quantity >= line.stock && line.stock > 0)
    parts.push(" · ", textElement("span", "sin más stock", "pos-line-maxed"));
  target.replaceChildren(...parts);
}

function renderLineMessage(item: HTMLElement, line: CartLine): void {
  const message = lineMessage(line);
  const messageBox = linePart(item, '[data-role="message"]');
  messageBox.className = `small mt-1 ${message ? STATUS_CLASSES[message.tone] : "d-none"}`;
  messageBox.textContent = message?.text ?? "";
}

export function updateLineElement(item: HTMLElement, line: CartLine, syncInput: boolean): void {
  renderUnitInfo(linePart(item, '[data-role="unit"]'), line);
  const quantity = linePart<HTMLInputElement>(item, '[data-action="quantity"]');
  if (syncInput) quantity.value = String(line.quantity);
  linePart<HTMLButtonElement>(item, '[data-action="decrease"]').disabled = line.quantity <= 1;
  linePart<HTMLButtonElement>(item, '[data-action="increase"]').disabled = line.quantity >= maxQuantity(line);
  linePart(item, '[data-role="total"]').innerHTML = formatDual(lineTotalUsd(line));
  renderLineMessage(item, line);
  const invalid = lineMarks.inputErrors.has(line.product_id) || lineHasError(line);
  quantity.classList.toggle("is-invalid", invalid);
  quantity.setAttribute("aria-invalid", String(invalid));
  item.classList.toggle("pos-line-error", lineHasError(line));
}

function labelLineControls(item: HTMLElement, line: CartLine): void {
  const messageId = `pos-line-message-${line.product_id}`;
  linePart(item, '[data-role="message"]').id = messageId;
  const quantity = linePart<HTMLInputElement>(item, '[data-action="quantity"]');
  quantity.setAttribute("aria-label", `Cantidad de ${line.name}`);
  quantity.setAttribute("aria-describedby", messageId);
  linePart(item, '[data-action="decrease"]').setAttribute("aria-label", `Restar una unidad de ${line.name}`);
  linePart(item, '[data-action="increase"]').setAttribute("aria-label", `Sumar una unidad de ${line.name}`);
  linePart(item, '[data-action="remove"]').setAttribute("aria-label", `Quitar ${line.name} del carrito`);
}

export function lineElement(line: CartLine): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "list-group-item pos-line";
  item.dataset.id = String(line.product_id);
  item.innerHTML = LINE_TEMPLATE;
  linePart(item, '[data-role="name"]').textContent = line.name;
  labelLineControls(item, line);
  updateLineElement(item, line, true);
  return item;
}
