export const CART_STORAGE_KEY = "minicajero.pos-cart";
export const SEARCH_DEBOUNCE_MS = 200;
export const RESULTS_LIMIT = 24;
export const STATUS_CLEAR_MS = 4000;
export const LG_BREAKPOINT = "(min-width: 992px)";
export const SCAN_TOAST_MS = 2500;
export const SCAN_TOAST_KEY = "phone-scan";
export const PRODUCT_DETAIL = /^products\.(\d+)$/;
export const ITEM_DETAIL = /^items\[(\d+)\]/;
export const STALE_DETAIL = /^(prices\.\d+|rate|tax_percent)$/;

export type StatusTone = "success" | "warning" | "danger";

export type ResultsView = "loading" | "error" | "empty" | "ready";

export interface SaleBasis {
  prices: Map<number, number>;
  rate: number | null;
  ivaPercent: number | null;
}

export const STATUS_CLASSES: Record<StatusTone, string> = {
  success: "text-success",
  warning: "text-warning-emphasis",
  danger: "text-danger",
};
