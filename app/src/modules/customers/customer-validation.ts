import type { JsonObject } from "../../lib/request";
import { collapseSpaces } from "../../lib/text";
import { Validator } from "../../lib/validation";
import { readNormalizedDocNumber } from "./customer-document";
import { readPhone } from "./customer-phone";
import { type CustomerData, DOC_TYPES } from "./customers.types";

const NAME_MAX_LENGTH = 60;
const NAME_PATTERN = /\p{L}/u;

function readName(v: Validator, field: "first_name" | "last_name"): string {
  const name = v.requiredString(field, {
    max: NAME_MAX_LENGTH,
    pattern: NAME_PATTERN,
    patternMessage: "Debe contener letras",
  });
  return collapseSpaces(name);
}

/**
 * Valida y normaliza los datos de un cliente: recorta y compacta nombres, normaliza el documento
 * (ver `readNormalizedDocNumber`) y el teléfono. Lanza 400 con detalle por campo.
 */
export function validateCustomer(body: JsonObject): CustomerData {
  const data: JsonObject = {
    ...body,
    doc_type: typeof body.doc_type === "string" ? body.doc_type.trim().toUpperCase() : body.doc_type,
  };
  const v = new Validator(data);
  const first_name = readName(v, "first_name");
  const last_name = readName(v, "last_name");
  const doc_type = v.oneOf("doc_type", DOC_TYPES);
  const doc_number = readNormalizedDocNumber(v, data.doc_type, data.doc_number);
  const phone = readPhone(v);
  v.assertValid("Revisa los datos del cliente");
  return { first_name, last_name, doc_type, doc_number, phone };
}
