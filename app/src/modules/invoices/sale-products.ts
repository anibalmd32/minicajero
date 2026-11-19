import type { Database } from "bun:sqlite";
import { BadRequestError, ConflictError, type ErrorDetails } from "../../lib/http-errors";
import { findProductById, type ProductRow } from "../products/products.repository";
import { productKey, units } from "./invoice-format";
import type { SaleLine } from "./sale.types";

export function requireProduct(products: Map<number, ProductRow>, productId: number): ProductRow {
  const product = products.get(productId);
  if (!product) throw new Error(`Producto ${productId} no cargado para la venta`);
  return product;
}

export function loadProducts(lines: readonly SaleLine[], db: Database): Map<number, ProductRow> {
  const products = new Map<number, ProductRow>();
  const missing: ErrorDetails = {};
  const inactive: ErrorDetails = {};
  for (const line of lines) {
    const product = findProductById(line.product_id, db);
    if (!product) missing[productKey(line.product_id)] = `El producto ${line.product_id} no existe`;
    else if (product.active !== 1) inactive[productKey(line.product_id)] = `${product.name} está desactivado`;
    else products.set(product.id, product);
  }
  if (Object.keys(missing).length > 0) throw new BadRequestError("Hay productos que no existen", missing);
  if (Object.keys(inactive).length > 0) {
    throw new ConflictError("Hay productos desactivados: actívalos o quítalos de la venta", inactive);
  }
  return products;
}

export function assertStockAvailable(lines: readonly SaleLine[], products: Map<number, ProductRow>): void {
  const details: ErrorDetails = {};
  const names: string[] = [];
  for (const line of lines) {
    const product = requireProduct(products, line.product_id);
    if (product.stock >= line.quantity) continue;
    details[productKey(product.id)] =
      `${product.name}: disponible ${units(product.stock)}, solicitado ${units(line.quantity)}`;
    names.push(`${product.name} (disponible ${product.stock})`);
  }
  if (names.length > 0) throw new ConflictError(`Stock insuficiente: ${names.join(", ")}`, details);
}
