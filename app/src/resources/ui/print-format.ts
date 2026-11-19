/** Formato de papel de la factura impresa. */
export type PrintFormat = "letter" | "a4" | "ticket";

/** Formatos en el orden en que se ofrecen, con su etiqueta y el valor que admite `?formato=`. */
export const PRINT_FORMATS: readonly { value: PrintFormat; label: string; param: string }[] = [
  { value: "letter", label: "Carta", param: "carta" },
  { value: "a4", label: "A4", param: "a4" },
  { value: "ticket", label: "Ticket 80 mm", param: "ticket" },
];

/** Formato usado si no hay preferencia guardada. */
export const DEFAULT_PRINT_FORMAT: PrintFormat = "letter";

/** Ancho del papel de ticket en milímetros. */
export const TICKET_WIDTH_MM = 80;

/** Margen del ticket en milímetros (igual al relleno de la hoja en pantalla). */
export const TICKET_MARGIN_MM = 4;

const TICKET_MIN_HEIGHT_MM = 80;
const TICKET_SAFETY_MM = 4;
const MM_PER_CSS_PX = 25.4 / 96;

const PAGE_RULES: Record<Exclude<PrintFormat, "ticket">, string> = {
  letter: "@page { size: letter portrait; margin: 14mm 14mm 16mm; }",
  a4: "@page { size: A4 portrait; margin: 14mm 14mm 16mm; }",
};

/** ¿Es un formato válido? */
export function isPrintFormat(value: unknown): value is PrintFormat {
  return PRINT_FORMATS.some((format) => format.value === value);
}

/** Interpreta `?formato=` (`carta`, `a4`, `ticket`, sin distinguir mayúsculas) o un valor guardado; `null` si no es válido. */
export function parsePrintFormat(value: string | null | undefined): PrintFormat | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (isPrintFormat(normalized)) return normalized;
  return PRINT_FORMATS.find((format) => format.param === normalized)?.value ?? null;
}

/**
 * Alto de la página de ticket (mm) para que toda la factura quepa en una sola tira:
 * `sheetHeightPx` es el alto de la hoja en pantalla, que ya incluye el relleno equivalente a los márgenes.
 */
export function ticketPageHeightMm(sheetHeightPx: number): number {
  const contentMm = Number.isFinite(sheetHeightPx) && sheetHeightPx > 0 ? sheetHeightPx * MM_PER_CSS_PX : 0;
  return Math.max(TICKET_MIN_HEIGHT_MM, Math.ceil(contentMm + TICKET_SAFETY_MM));
}

/** Regla `@page` del formato; el ticket necesita el alto calculado con `ticketPageHeightMm`. */
export function pageRule(format: PrintFormat, ticketHeightMm = TICKET_MIN_HEIGHT_MM): string {
  if (format !== "ticket") return PAGE_RULES[format];
  return `@page { size: ${TICKET_WIDTH_MM}mm ${ticketHeightMm}mm; margin: ${TICKET_MARGIN_MM}mm; }`;
}
