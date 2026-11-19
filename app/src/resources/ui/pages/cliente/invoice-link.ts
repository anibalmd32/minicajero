import { invoiceNumberLabel } from "../../invoices";

/** Enlace a la factura, que abre su detalle en el listado de facturas. */
export function invoiceLink(invoiceId: number, number: number): HTMLAnchorElement {
  const link = document.createElement("a");
  link.href = `/facturas/${invoiceId}`;
  link.className = "fw-semibold text-decoration-none";
  link.textContent = `Factura ${invoiceNumberLabel(number)}`;
  return link;
}
