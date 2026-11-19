import { customerFullName } from "../../customers";
import { asSentence, formatDateTime } from "../../format";
import { type Invoice, invoiceNumberLabel, invoiceStatusBadge } from "../../invoices";
import { textElement } from "../../list";
import { customerStatementUrl } from "../../payments";
import { detailElements as e } from "./detail-elements";

/** Título del modal con el número y el estado (o solo el número de la solicitud mientras carga). */
export function setTitle(current: Invoice | null, id: number): void {
  e.title.replaceChildren(`Factura ${current ? invoiceNumberLabel(current.number) : ""}`.trim());
  if (current) e.title.append(invoiceStatusBadge(current.status));
  e.dateText.textContent = current ? formatDateTime(current.created_at) : "";
  e.modalElement.setAttribute(
    "aria-label",
    current ? `Factura ${invoiceNumberLabel(current.number)}` : `Factura ${id}`,
  );
}

/** Aviso de factura anulada con fecha y motivo. */
export function renderVoidNotice(current: Invoice): void {
  const isVoid = current.status === "void";
  e.voidNotice.classList.toggle("d-none", !isVoid);
  if (!isVoid) return;
  const when = current.voided_at ? ` el ${formatDateTime(current.voided_at)}` : "";
  const reason = current.void_reason ? ` Motivo: ${asSentence(current.void_reason)}` : " Sin motivo indicado.";
  e.voidNotice.replaceChildren(
    textElement("strong", asSentence(`Factura anulada${when}`)),
    document.createTextNode(`${reason} Las unidades vendidas se devolvieron al inventario y no suma en los totales.`),
  );
}

function customerLink(href: string, text: string): HTMLAnchorElement {
  const link = document.createElement("a");
  link.href = href;
  link.textContent = text;
  return link;
}

/** Datos del cliente con enlaces a sus facturas y su estado de cuenta. */
export function renderCustomer(current: Invoice): void {
  const customer = current.customer;
  if (!customer) {
    e.customerText.replaceChildren(textElement("span", "Consumidor final", "fst-italic"));
    return;
  }
  const links = document.createElement("span");
  links.className = "d-flex flex-wrap column-gap-3 small fw-normal";
  links.append(
    customerLink(`/facturas?cliente=${customer.id}`, "Ver sus facturas"),
    customerLink(customerStatementUrl(customer.id), "Estado de cuenta"),
  );
  e.customerText.replaceChildren(
    textElement("span", customerFullName(customer), "d-block"),
    textElement("span", customer.document, "d-block small text-body-secondary fw-normal"),
    links,
  );
}
