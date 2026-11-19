import { type BusinessSettings, fetchSettings } from "./settings";

const FALLBACK_BUSINESS_NAME = "MiniCajero";

/** Muestra `text` en una línea opcional de la hoja, o la oculta si está vacío. */
export function setOptionalLine(element: HTMLElement, text: string): void {
  element.textContent = text;
  element.classList.toggle("d-none", text === "");
}

function sheetElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Falta el elemento #${id} en la vista imprimible`);
  return element;
}

function isBusinessIncomplete(business: BusinessSettings | null): boolean {
  if (business === null) return false;
  const values = [business.business_name, business.business_rif, business.business_address, business.business_phone];
  return values.some((value) => value.trim() === "");
}

/**
 * Pinta los datos del negocio en la cabecera de la hoja (`#sheet-business-*`) y muestra el aviso
 * `#print-business-hint` si falta alguno. Sin ajustes (`null`) usa el nombre de la app.
 */
export function renderBusinessHeader(business: BusinessSettings | null): void {
  sheetElement("sheet-business-name").textContent = business?.business_name.trim() || FALLBACK_BUSINESS_NAME;
  const rif = business?.business_rif.trim() ?? "";
  const address = business?.business_address.trim() ?? "";
  const phone = business?.business_phone.trim() ?? "";
  setOptionalLine(sheetElement("sheet-business-rif"), rif ? `RIF: ${rif}` : "");
  setOptionalLine(sheetElement("sheet-business-address"), address);
  setOptionalLine(sheetElement("sheet-business-phone"), phone ? `Teléfono: ${phone}` : "");
  sheetElement("print-business-hint").classList.toggle("d-none", !isBusinessIncomplete(business));
}

/** Oculta el aviso de datos del negocio incompletos. */
export function hideBusinessHint(): void {
  sheetElement("print-business-hint").classList.add("d-none");
}

/** Datos del negocio para la cabecera, o `null` si no se pudieron cargar (la hoja se imprime igual). */
export async function fetchOptionalSettings(): Promise<BusinessSettings | null> {
  try {
    return await fetchSettings();
  } catch {
    return null;
  }
}
