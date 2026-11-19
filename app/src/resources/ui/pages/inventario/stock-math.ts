import { ApiError } from "../../api";
import { type StockAdjustmentInput, unitsLabel } from "../../products";

export type StockMode = "add" | "remove" | "set";

export const QUANTITY_LABELS: Record<StockMode, string> = {
  add: "Cantidad a sumar",
  remove: "Cantidad a restar",
  set: "Nuevo stock",
};

export function resultingStock(mode: StockMode, current: number, quantity: number): number {
  if (mode === "add") return current + quantity;
  if (mode === "remove") return current - quantity;
  return quantity;
}

export function quantityError(mode: StockMode, current: number, quantity: number | null): string | null {
  if (quantity === null) return "Este campo es obligatorio";
  if (Number.isNaN(quantity)) return "Debe ser un número entero, sin decimales";
  if (mode === "set") {
    if (quantity < 0) return "Debe ser mayor o igual que 0";
    return quantity === current ? `El stock ya es ${unitsLabel(current)}` : null;
  }
  if (quantity <= 0) return "Debe ser mayor que 0";
  if (mode === "remove" && quantity > current) return `Como máximo puedes restar ${unitsLabel(current)}`;
  return null;
}

export function toAdjustment(mode: StockMode, quantity: number, reason: string): StockAdjustmentInput {
  if (mode === "set") return { set: quantity, reason };
  return { delta: mode === "add" ? quantity : -quantity, reason };
}

export function withQuantityField(err: unknown): unknown {
  if (!(err instanceof ApiError) || !err.hasFieldErrors) return err;
  const { delta, set, ...rest } = err.details;
  const quantity = delta ?? set;
  return new ApiError(err.status, err.message, quantity ? { ...rest, quantity } : rest);
}
