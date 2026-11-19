import type { Invoice } from "../../invoices";
import type { Product } from "../../products";
import type { Cart } from "../../sale-cart";
import { readStoredCart, writeStoredCart } from "./stored-cart";

interface SaleState {
  cart: Cart;
  ivaPercent: number | null;
  settingsFailed: boolean;
  results: Product[];
  resultsQuery: string | null;
  resultsTotal: number;
  activeIndex: number;
  searchRequest: number;
  searchTimer: number | undefined;
  pendingSearch: Promise<Product[] | null> | null;
  enterQueue: Promise<void>;
  statusTimer: number | undefined;
  lastInvoice: Invoice | null;
  saleDone: boolean;
}

/** Estado mutable del punto de venta, compartido por los módulos de la página. */
export const state: SaleState = {
  cart: readStoredCart(),
  ivaPercent: null,
  settingsFailed: false,
  results: [],
  resultsQuery: null,
  resultsTotal: 0,
  activeIndex: -1,
  searchRequest: 0,
  searchTimer: undefined,
  pendingSearch: null,
  enterQueue: Promise.resolve(),
  statusTimer: undefined,
  lastInvoice: null,
  saleDone: false,
};

/** Avisos por producto que se pintan en las líneas del carrito. */
export const lineMarks = {
  unavailable: new Map<number, string>(),
  serverIssues: new Map<number, string>(),
  lineNotices: new Map<number, string>(),
  inputErrors: new Map<number, string>(),
};

export function saveCart(): void {
  writeStoredCart(state.cart);
}

export function clearProductMarks(productId: number): void {
  for (const marks of Object.values(lineMarks)) marks.delete(productId);
}

export function clearAllMarks(): void {
  for (const marks of Object.values(lineMarks)) marks.clear();
}
