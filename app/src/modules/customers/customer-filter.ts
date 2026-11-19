import { BadRequestError } from "../../lib/http-errors";
import { parseQueryFlag } from "../../lib/request";
import { collapseSpaces } from "../../lib/text";
import type { CustomerFilter, CustomerQuery, DocType, SearchTerm } from "./customers.types";
import { onlyDigits, withoutLeadingZeros } from "./digits";

const SEARCH_MAX_LENGTH = 100;
const SEARCH_MAX_TERMS = 6;
const SEARCH_DOCUMENT_PATTERN = /^([VEJ])[-.]?(\d[\d.-]*)$/i;
const SEARCH_DOCUMENT_PREFIX = /(?<![\p{L}\d])([VEJ])\s*[-.]?\s*(?=\d)/giu;
const SEARCH_NUMERIC_PATTERN = /^[+\d().-]*\d[\d().-]*$/;

function parseSearchTerm(token: string): SearchTerm {
  const document = SEARCH_DOCUMENT_PATTERN.exec(token);
  if (document) {
    const [, letter = "", body = ""] = document;
    return {
      kind: "document",
      docType: letter.toUpperCase() as DocType,
      digits: withoutLeadingZeros(onlyDigits(body)),
    };
  }
  if (SEARCH_NUMERIC_PATTERN.test(token)) {
    const digits = onlyDigits(token);
    return { kind: "text", text: token, phoneDigits: digits, docDigits: withoutLeadingZeros(digits) };
  }
  return { kind: "text", text: token, phoneDigits: null, docDigits: null };
}

function searchTokens(q: string): string[] {
  if (q === "") return [];
  return q.replace(SEARCH_DOCUMENT_PREFIX, "$1-").split(" ").slice(0, SEARCH_MAX_TERMS);
}

/**
 * Interpreta los criterios del listado. `q` se divide en palabras y todas deben coincidir:
 * `V-123`/`V123`/`V 123` busca por tipo y número de documento; una palabra numérica busca en documento y teléfono;
 * cualquier otra en nombre y apellidos (sin distinguir mayúsculas ni tildes). `debtors=1` deja solo clientes con
 * saldo pendiente.
 */
export function parseCustomerFilter(query: CustomerQuery): CustomerFilter {
  const q = collapseSpaces(query.q?.trim() ?? "");
  if (q.length > SEARCH_MAX_LENGTH) {
    throw new BadRequestError("Parámetros de búsqueda inválidos", {
      q: `Debe tener como máximo ${SEARCH_MAX_LENGTH} caracteres`,
    });
  }
  return {
    terms: searchTokens(q).map(parseSearchTerm),
    debtorsOnly: parseQueryFlag(query.debtors, "debtors") ?? false,
  };
}
