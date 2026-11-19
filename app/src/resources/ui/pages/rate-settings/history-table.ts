import { errorMessage } from "../../api";
import {
  type ExchangeRateHistory,
  type ExchangeRateRecord,
  fetchRateHistory,
  type RateSource,
} from "../../exchange-rate";
import { formatDateTime, formatInteger, formatRate } from "../../format";
import { elements } from "./elements";
import { SOURCE_LABELS } from "./rate-overview";

const HISTORY_PAGE_SIZE = 10;
const SOURCE_BADGES: Record<RateSource, string> = { api: "text-bg-primary", manual: "text-bg-secondary" };

type HistoryState = "loading" | "error" | "empty" | "ready";

let historyOffset = 0;
let historyRequest = 0;

/** Vuelve el historial a la primera página (sin recargarlo). */
export function resetHistoryOffset(): void {
  historyOffset = 0;
}

function showHistoryState(state: HistoryState): void {
  elements.historyLoading.classList.toggle("d-none", state !== "loading");
  elements.historyError.classList.toggle("d-none", state !== "error");
  elements.historyEmpty.classList.toggle("d-none", state !== "empty");
  elements.historyTable.classList.toggle("d-none", state !== "ready");
}

function cell(text: string, className = ""): HTMLTableCellElement {
  const td = document.createElement("td");
  td.className = className;
  td.textContent = text;
  return td;
}

function sourceCell(source: RateSource): HTMLTableCellElement {
  const td = document.createElement("td");
  const badge = document.createElement("span");
  badge.className = `badge ${SOURCE_BADGES[source]}`;
  badge.textContent = SOURCE_LABELS[source];
  td.append(badge);
  return td;
}

function historyRow(record: ExchangeRateRecord): HTMLTableRowElement {
  const row = document.createElement("tr");
  row.append(
    cell(formatDateTime(record.created_at), "text-nowrap"),
    cell(formatRate(record.rate), "text-nowrap fw-semibold"),
    sourceCell(record.source),
    cell(record.api_date ? formatDateTime(record.api_date) : "—", "d-none d-md-table-cell text-nowrap"),
    cell(record.source === "api" ? formatDateTime(record.last_checked_at) : "—", "d-none d-lg-table-cell text-nowrap"),
  );
  return row;
}

function renderHistory(history: ExchangeRateHistory): void {
  elements.historyBody.replaceChildren(...history.items.map(historyRow));
  const first = history.offset + 1;
  const last = history.offset + history.items.length;
  elements.historyRange.textContent = `Mostrando ${formatInteger(first)}–${formatInteger(last)} de ${formatInteger(history.total)}`;
  elements.historyPrev.disabled = history.offset === 0;
  elements.historyNext.disabled = last >= history.total;
}

function showLoadedHistory(history: ExchangeRateHistory): void {
  if (history.total === 0) {
    showHistoryState("empty");
    return;
  }
  renderHistory(history);
  showHistoryState("ready");
}

/** Consulta la página actual del historial; ignora respuestas ya reemplazadas por otra consulta. */
export async function loadHistory(): Promise<void> {
  const request = ++historyRequest;
  if (elements.historyTable.classList.contains("d-none")) showHistoryState("loading");
  try {
    const history = await fetchRateHistory(HISTORY_PAGE_SIZE, historyOffset);
    if (request !== historyRequest) return;
    if (history.total > 0 && history.items.length === 0 && historyOffset > 0) {
      historyOffset = Math.max(0, Math.floor((history.total - 1) / HISTORY_PAGE_SIZE) * HISTORY_PAGE_SIZE);
      return loadHistory();
    }
    showLoadedHistory(history);
  } catch (err) {
    if (request !== historyRequest) return;
    elements.historyErrorMessage.textContent = errorMessage(err);
    showHistoryState("error");
  }
}

/** Mueve el historial `direction` páginas (-1 anterior, 1 siguiente) y lo recarga. */
export function moveHistoryPage(direction: -1 | 1): void {
  historyOffset = Math.max(0, historyOffset + direction * HISTORY_PAGE_SIZE);
  void loadHistory();
}
