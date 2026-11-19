import type { Invoice } from "../../invoices";
import { detailElements as e } from "./detail-elements";

/** Callbacks del detalle: al cerrarse el modal y cuando una factura cambia (anulada o recargada). */
export interface InvoiceDetailHooks {
  onClosed: () => void;
  onChanged: () => void;
}

/** Control del modal de detalle de factura. */
export interface InvoiceDetailController {
  open: (id: number) => void;
  rerender: () => void;
}

type DetailView = "loading" | "error" | "detail" | "void" | "payment";

interface DetailState {
  invoiceId: number | null;
  invoice: Invoice | null;
  session: number;
  hooks: InvoiceDetailHooks;
}

/** Estado vivo del modal: factura abierta, sesión de carga y callbacks. */
export const detailState: DetailState = {
  invoiceId: null,
  invoice: null,
  session: 0,
  hooks: { onClosed: () => undefined, onChanged: () => undefined },
};

/** Muestra una sola vista del modal y sus botones. */
export function showView(view: DetailView): void {
  e.loading.classList.toggle("d-none", view !== "loading");
  e.loadError.classList.toggle("d-none", view !== "error");
  e.detail.classList.toggle("d-none", view !== "detail");
  e.voidForm.classList.toggle("d-none", view !== "void");
  e.paymentForm.form.classList.toggle("d-none", view !== "payment");
  e.detailActions.classList.toggle("d-none", view === "void" || view === "payment");
  e.voidActions.classList.toggle("d-none", view !== "void");
  e.paymentActions.classList.toggle("d-none", view !== "payment");
  e.printButton.disabled = view !== "detail";
}
