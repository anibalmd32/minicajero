import type { PaymentType } from "../../../invoices";
import type { CartCustomer } from "../../../sale-cart";
import type { PickerOption } from "./picker.types";

export const SEARCH_DEBOUNCE_MS = 250;
export const RESULTS_LIMIT = 8;

interface PickerState {
  current: CartCustomer | null;
  currentPayment: PaymentType;
  editing: boolean;
  options: PickerOption[];
  activeIndex: number;
  request: number;
  searchTimer: number | undefined;
  loading: boolean;
  loadError: string | null;
  lastQuery: string;
  onChange: (customer: CartCustomer | null) => void;
}

export const pickerState: PickerState = {
  current: null,
  currentPayment: "cash",
  editing: false,
  options: [],
  activeIndex: -1,
  request: 0,
  searchTimer: undefined,
  loading: false,
  loadError: null,
  lastQuery: "",
  onChange: () => undefined,
};
