import { getCurrentRate } from "../../money";
import { type CartTotals, computeTotals } from "../../sale-cart";
import { lineHasError } from "./line-state";
import { state } from "./state";

export function isCredit(): boolean {
  return state.cart.payment_type === "credit";
}

export function currentTotals(): CartTotals {
  return computeTotals(state.cart.lines, getCurrentRate(), state.ivaPercent ?? 0);
}

export function blockingReason(): string | null {
  const { cart, ivaPercent, settingsFailed } = state;
  if (cart.lines.length === 0) return "Agrega al menos un producto para cobrar.";
  if (cart.lines.some(lineHasError)) return "Corrige los productos marcados en rojo.";
  if (getCurrentRate() === null) return "No hay tasa de cambio: fija una tasa manual para poder vender.";
  if (ivaPercent === null)
    return settingsFailed ? "No se pudo cargar el IVA configurado. Recarga la página." : "Cargando configuración…";
  if (cart.payment_type === "credit" && !cart.customer) return "Falta elegir a quién se le fía.";
  return null;
}
