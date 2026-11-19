import { escapeLike } from "../../lib/text";
import type { InvoiceFilter, InvoiceSearchTerm } from "./invoice-listing.types";
import type { SqlParams } from "./invoice-sql";

function termCondition(term: InvoiceSearchTerm, index: number, params: SqlParams): string {
  if (term.kind === "document") {
    params[`doc_type_${index}`] = term.docType;
    params[`doc_prefix_${index}`] = `${escapeLike(term.digits)}%`;
    return `(c.doc_type = $doc_type_${index} AND ltrim(c.doc_number, '0') LIKE $doc_prefix_${index} ESCAPE '\\')`;
  }
  if (term.kind === "number") {
    params[`number_${index}`] = Number(term.digits);
    params[`doc_digits_${index}`] = `%${escapeLike(term.digits)}%`;
    return `(i.number = $number_${index} OR c.doc_number LIKE $doc_digits_${index} ESCAPE '\\')`;
  }
  params[`text_${index}`] = `%${escapeLike(term.text)}%`;
  return `c.search_text LIKE $text_${index} ESCAPE '\\'`;
}

function columnConditions(filter: InvoiceFilter, params: SqlParams): string[] {
  const conditions: string[] = [];
  if (filter.status !== null) {
    params.status = filter.status;
    conditions.push("i.status = $status");
  }
  if (filter.paymentType !== null) {
    params.payment_type = filter.paymentType;
    conditions.push("i.payment_type = $payment_type");
  }
  if (filter.customerId !== null) {
    params.customer_id = filter.customerId;
    conditions.push("i.customer_id = $customer_id");
  }
  return conditions;
}

function dateConditions(filter: InvoiceFilter, params: SqlParams): string[] {
  const conditions: string[] = [];
  if (filter.createdFrom !== null) {
    params.created_from = filter.createdFrom;
    conditions.push("i.created_at >= $created_from");
  }
  if (filter.createdTo !== null) {
    params.created_to = filter.createdTo;
    conditions.push("i.created_at < $created_to");
  }
  return conditions;
}

export function buildWhere(filter: InvoiceFilter): { where: string; params: SqlParams } {
  const params: SqlParams = {};
  const conditions = [
    ...filter.terms.map((term, index) => termCondition(term, index, params)),
    ...columnConditions(filter, params),
    ...dateConditions(filter, params),
  ];
  return { where: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "", params };
}
