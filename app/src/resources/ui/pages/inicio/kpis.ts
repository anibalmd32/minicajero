import type { Dashboard, SalesTotals } from "../../dashboard";
import { requireElement } from "../../dom";
import { formatInteger } from "../../format";
import { dualAmountTexts, usdCentsToBs } from "../../money";
import { invoicesUrl, localDate, monthFormat, plural } from "./dashboard-text";
import { elements } from "./elements";

interface KpiView {
  value: string;
  secondary: string;
  meta: string;
}

function renderKpi(prefix: string, view: KpiView): void {
  requireElement(`${prefix}-value`).textContent = view.value;
  requireElement(`${prefix}-secondary`).textContent = view.secondary;
  requireElement(`${prefix}-meta`).textContent = view.meta;
}

function salesKpi(totals: SalesTotals, meta: string): KpiView {
  const { primary, secondary } = dualAmountTexts(totals.total_usd_cents, totals.total_bs_cents);
  return { value: primary, secondary: `(${secondary})`, meta };
}

function todayMeta(totals: SalesTotals): string {
  return totals.invoices === 0 ? "Sin ventas todavía" : plural(totals.invoices, "factura", "facturas");
}

function monthMeta(data: Dashboard): string {
  const month = monthFormat.format(localDate(data.today));
  return `${plural(data.sales_month.invoices, "factura", "facturas")} en ${month}`;
}

function debtKpi(data: Dashboard): KpiView {
  const { total_usd_cents, debtors, pending_invoices } = data.receivables;
  const { primary, secondary } = dualAmountTexts(total_usd_cents, usdCentsToBs(total_usd_cents));
  const meta =
    debtors === 0
      ? "Nadie te debe"
      : `${plural(debtors, "cliente", "clientes")} · ${plural(pending_invoices, "factura pendiente", "facturas pendientes")}`;
  return { value: primary, secondary: `(${secondary})`, meta };
}

function stockKpi(data: Dashboard): KpiView {
  const { low_stock, out_of_stock, threshold } = data.stock;
  const units = plural(threshold, "unidad", "unidades");
  if (low_stock === 0) return { value: "0", secondary: "Todo bien surtido", meta: `Aviso con ${units} o menos` };
  return {
    value: formatInteger(low_stock),
    secondary: `${low_stock === 1 ? "producto" : "productos"} con ${units} o menos`,
    meta: out_of_stock === 0 ? "Ninguno agotado" : plural(out_of_stock, "agotado", "agotados"),
  };
}

export function renderKpis(data: Dashboard): void {
  renderKpi("kpi-today", salesKpi(data.sales_today, todayMeta(data.sales_today)));
  renderKpi("kpi-month", salesKpi(data.sales_month, monthMeta(data)));
  renderKpi("kpi-debt", debtKpi(data));
  renderKpi("kpi-stock", stockKpi(data));
  elements.todayLink.href = invoicesUrl(data.today, data.today);
  elements.monthLink.href = invoicesUrl(data.month_start, data.today);
  elements.debtCard.classList.toggle("dashboard-kpi-alert", data.receivables.total_usd_cents > 0);
  elements.stockCard.classList.toggle("dashboard-kpi-warning", data.stock.low_stock > 0);
}
