import type { Database } from "bun:sqlite";
import { ConflictError } from "../../lib/http-errors";
import { applyStockDelta, insertStockMovement } from "../products/products.repository";
import { productKey } from "./invoice-format";
import type { InvoiceItemData, InvoiceItemRow } from "./invoices.types";

export function discountStock(invoiceNumber: number, items: readonly InvoiceItemData[], db: Database): void {
  for (const item of items) {
    const stockAfter = applyStockDelta(item.product_id, -item.quantity, db);
    if (stockAfter === null) {
      throw new ConflictError(`Stock insuficiente: ${item.product_name}`, {
        [productKey(item.product_id)]: `${item.product_name}: stock insuficiente`,
      });
    }
    insertStockMovement(item.product_id, -item.quantity, stockAfter, `Venta factura #${invoiceNumber}`, db);
  }
}

export function restoreStock(invoiceNumber: number, items: readonly InvoiceItemRow[], db: Database): void {
  for (const item of items) {
    const stockAfter = applyStockDelta(item.product_id, item.quantity, db);
    if (stockAfter === null) throw new Error(`No se pudo devolver el stock del producto ${item.product_id}`);
    insertStockMovement(item.product_id, item.quantity, stockAfter, `Anulación factura #${invoiceNumber}`, db);
  }
}
