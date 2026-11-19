import { api } from "./api";

/** Tipo de documento de identidad del cliente. */
export type DocType = "V" | "E" | "J";

/** Cliente devuelto por `/api/v1/customers`, con su documento formateado y saldo pendiente en centavos USD. */
export interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  doc_type: DocType;
  doc_number: string;
  document: string;
  phone: string | null;
  balance_usd_cents: number;
  created_at: string;
  updated_at: string;
}

/** Página del listado de clientes. */
export interface CustomerPage {
  items: Customer[];
  total: number;
  limit: number;
  offset: number;
}

/** Criterios del listado: texto libre (nombre, documento o teléfono) y solo deudores. */
export interface CustomerSearch {
  q: string;
  debtorsOnly: boolean;
  limit: number;
  offset: number;
}

/** Datos del formulario de cliente; se envían tal cual para que el servidor los valide. */
export interface CustomerInput {
  first_name: string;
  last_name: string;
  doc_type: string;
  doc_number: string;
  phone: string;
}

/** Busca clientes con su saldo. */
export function fetchCustomers(search: CustomerSearch): Promise<CustomerPage> {
  return api.get<CustomerPage>("/customers", {
    q: search.q,
    debtors: search.debtorsOnly ? 1 : undefined,
    limit: search.limit,
    offset: search.offset,
  });
}

/** Registra un cliente nuevo. */
export function createCustomer(input: CustomerInput): Promise<Customer> {
  return api.post<Customer>("/customers", input);
}

/** Reemplaza los datos de un cliente. */
export function updateCustomer(id: number, input: CustomerInput): Promise<Customer> {
  return api.put<Customer>(`/customers/${id}`, input);
}

/** Elimina un cliente (el servidor responde 409 si tiene facturas). */
export function deleteCustomer(id: number): Promise<void> {
  return api.delete(`/customers/${id}`);
}

/** Nombre completo para mostrar: `Nombre Apellidos`. */
export function customerFullName(customer: Pick<Customer, "first_name" | "last_name">): string {
  return `${customer.first_name} ${customer.last_name}`.trim();
}

/** Número de documento tal como se edita en el formulario, sin el prefijo de tipo (`J-01234567-8` -> `01234567-8`). */
export function editableDocNumber(customer: Pick<Customer, "doc_type" | "document">): string {
  const prefix = `${customer.doc_type}-`;
  return customer.document.startsWith(prefix) ? customer.document.slice(prefix.length) : customer.document;
}

const VE_LOCAL_PHONE = /^(0\d{3})(\d{7})$/;

/** Teléfono para mostrar: los venezolanos como `0412-1234567`; el resto tal cual. */
export function formatPhone(phone: string | null): string {
  if (!phone) return "";
  const match = VE_LOCAL_PHONE.exec(phone);
  return match ? `${match[1]}-${match[2]}` : phone;
}

/** Datos actuales de un cliente, con su saldo. */
export function fetchCustomer(id: number): Promise<Customer> {
  return api.get<Customer>(`/customers/${id}`);
}
