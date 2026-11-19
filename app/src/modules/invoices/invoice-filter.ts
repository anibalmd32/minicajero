import { isLocalDate, localDayEndUtc, localDayStartUtc } from "../../lib/dates";
import { BadRequestError, type ErrorDetails } from "../../lib/http-errors";
import { collapseSpaces, searchKey } from "../../lib/text";
import type { DocType } from "../customers/customers.types";
import type { InvoiceFilter, InvoiceQuery, InvoiceSearchTerm } from "./invoice-listing.types";
import { INVOICE_STATUSES, PAYMENT_TYPES } from "./invoices.types";

const SEARCH_MAX_LENGTH = 100;
const SEARCH_MAX_TERMS = 6;
const ID_PATTERN = /^[1-9]\d{0,15}$/;
const SEARCH_NUMBER_PATTERN = /^#?(\d{1,15})$/;
const SEARCH_DOCUMENT_PATTERN = /^([VEJ])[-.]?(\d[\d.-]*)$/i;

function readQueryOption<const T extends string>(
  raw: string | null,
  field: string,
  allowed: readonly T[],
  details: ErrorDetails,
): T | null {
  const value = raw?.trim() ?? "";
  if (value === "") return null;
  if ((allowed as readonly string[]).includes(value)) return value as T;
  details[field] = `Valor no permitido. Opciones: ${allowed.join(", ")}`;
  return null;
}

function readQueryDate(raw: string | null, field: string, details: ErrorDetails): string | null {
  const value = raw?.trim() ?? "";
  if (value === "") return null;
  if (isLocalDate(value)) return value;
  details[field] = "Debe ser una fecha con formato AAAA-MM-DD";
  return null;
}

function stripLeadingZeros(digits: string): string {
  return digits.replace(/^0+(?=\d)/, "");
}

function parseSearchTerm(token: string): InvoiceSearchTerm {
  const number = SEARCH_NUMBER_PATTERN.exec(token);
  if (number?.[1] !== undefined) return { kind: "number", digits: stripLeadingZeros(number[1]) };
  const document = SEARCH_DOCUMENT_PATTERN.exec(token);
  if (document?.[1] !== undefined && document[2] !== undefined) {
    return {
      kind: "document",
      docType: document[1].toUpperCase() as DocType,
      digits: stripLeadingZeros(document[2].replace(/\D/g, "")),
    };
  }
  return { kind: "text", text: searchKey(token) };
}

function splitSearchText(q: string): string[] {
  return q === "" ? [] : q.replace(/(?<![\p{L}\d])([VEJ])\s+(?=\d)/giu, "$1-").split(" ");
}

/**
 * Interpreta los criterios del listado. `q` se divide en palabras y todas deben coincidir: un número (`12` o `#12`)
 * busca el número de factura o el documento del cliente, `V-123` el documento por prefijo y el resto el nombre del
 * cliente (sin distinguir mayúsculas ni tildes). `from` y `to` (`AAAA-MM-DD`, ambos incluidos) son días en hora
 * de Venezuela (UTC-4). Lanza 400 con detalle por campo si algún criterio es inválido.
 */
export function parseInvoiceFilter(query: InvoiceQuery): InvoiceFilter {
  const details: ErrorDetails = {};
  const q = collapseSpaces(query.q?.trim() ?? "");
  if (q.length > SEARCH_MAX_LENGTH) details.q = `Debe tener como máximo ${SEARCH_MAX_LENGTH} caracteres`;
  const status = readQueryOption(query.status, "status", INVOICE_STATUSES, details);
  const paymentType = readQueryOption(query.payment_type, "payment_type", PAYMENT_TYPES, details);
  const rawCustomerId = query.customer_id?.trim() ?? "";
  if (rawCustomerId !== "" && !ID_PATTERN.test(rawCustomerId)) details.customer_id = "Identificador inválido";
  const from = readQueryDate(query.from, "from", details);
  const to = readQueryDate(query.to, "to", details);
  if (from !== null && to !== null && from > to) details.to = "Debe ser igual o posterior a la fecha desde";
  if (Object.keys(details).length > 0) throw new BadRequestError("Parámetros de búsqueda inválidos", details);
  return {
    terms: splitSearchText(q).slice(0, SEARCH_MAX_TERMS).map(parseSearchTerm),
    status,
    paymentType,
    customerId: rawCustomerId === "" ? null : Number(rawCustomerId),
    createdFrom: from === null ? null : localDayStartUtc(from),
    createdTo: to === null ? null : localDayEndUtc(to),
  };
}
