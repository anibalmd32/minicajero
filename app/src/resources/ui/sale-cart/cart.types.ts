import type { PaymentType } from "../invoices";

/** Máximo de unidades de un producto en una venta (igual que el servidor). */
export const MAX_LINE_QUANTITY = 1_000_000;

/** Máximo de líneas por venta (igual que el servidor). */
export const MAX_SALE_LINES = 200;

/** Línea del carrito con los datos del producto conocidos al agregarlo o al refrescarlo. */
export interface CartLine {
  product_id: number;
  code: string | null;
  name: string;
  price_usd_cents: number;
  stock: number;
  quantity: number;
}

/** Cliente elegido para la venta (resumen suficiente para mostrarlo sin consultar la API). */
export interface CartCustomer {
  id: number;
  name: string;
  document: string;
  balance_usd_cents: number;
}

/** Venta en curso: líneas, cliente (`null` = consumidor final) y condición de pago. */
export interface Cart {
  lines: CartLine[];
  customer: CartCustomer | null;
  payment_type: PaymentType;
}

/** Datos de producto necesarios para agregarlo o refrescar su línea. */
export type CartProduct = Pick<CartLine, "code" | "name" | "price_usd_cents" | "stock"> & { id: number };

/** Resultado de agregar un producto: `added`, `no_stock` (sin stock), `max_reached` (ya está todo el stock en el carrito) o `too_many_lines`. */
export type AddResult = "added" | "no_stock" | "max_reached" | "too_many_lines";

/** Totales de la venta. Los montos en Bs son `null` si no hay tasa. */
export interface CartTotals {
  units: number;
  subtotal_usd_cents: number;
  tax_usd_cents: number;
  total_usd_cents: number;
  subtotal_bs_cents: number | null;
  tax_bs_cents: number | null;
  total_bs_cents: number | null;
}

/** Moneda en que el cliente entrega el dinero de una venta de contado. */
export type ReceivedCurrency = "USD" | "VES";

/** Vuelto de una venta de contado en ambas monedas; negativo si lo recibido no alcanza (lo que falta). */
export interface ChangeDue {
  usd_cents: number;
  bs_cents: number;
}
