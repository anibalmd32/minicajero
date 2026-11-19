import { PRODUCT_CODE_MAX_LENGTH } from "../../lib/product-code";

/**
 * Protocolo JSON del escáner con el teléfono, compartido por el servidor, la página móvil y las pestañas de la PC.
 * Cada mensaje es un objeto con `type`. El teléfono declara `version` en `hello` y el servidor la confirma en `ready`.
 */
export const PHONE_PROTOCOL_VERSION = 1;

/** Ruta de la página móvil en el servidor seguro de la red local. */
export const PHONE_PAGE_PATH = "/movil";

/** Ruta del WebSocket del teléfono en el servidor seguro de la red local. */
export const PHONE_SOCKET_PATH = "/movil/ws";

/** Ruta del WebSocket de las pestañas de la PC en el servidor local. */
export const PC_EVENTS_PATH = "/api/v1/phone/events";

/** Parámetro del fragmento de la URL (`#t=...`) que lleva el token de emparejamiento. */
export const PAIRING_TOKEN_PARAM = "t";

/** Tiempo que el servidor espera la respuesta de la PC a un escaneo antes de darlo por fallido. */
export const SCAN_TIMEOUT_MS = 5000;

/** Páginas de la PC que pueden recibir escaneos. */
export const SCAN_TARGET_PAGES = ["ventas", "inventario"] as const;

/** Página de la PC que recibe los escaneos. */
export type ScanTargetPage = (typeof SCAN_TARGET_PAGES)[number];

/** A dónde van los escaneos del teléfono en este momento. */
export type ScanContext = ScanTargetPage | "ninguno";

/** Resultado de un escaneo tal como lo ve el teléfono. */
export const SCAN_STATUSES = [
  "added",
  "filled",
  "created",
  "found",
  "not-found",
  "no-stock",
  "no-target",
  "error",
] as const;

/** Resultado de un escaneo. */
export type ScanStatus = (typeof SCAN_STATUSES)[number];

/** Códigos de cierre del WebSocket del teléfono. */
export const PHONE_CLOSE = {
  invalidToken: 4001,
  helloTimeout: 4002,
  tooManyAttempts: 4003,
  disconnectedFromPc: 4004,
  sessionExpired: 4005,
  replaced: 4006,
  outdated: 4007,
  badMessage: 4008,
  restarting: 4009,
  busy: 4010,
} as const;

/** Longitud máxima de un código escaneado (la misma que admite el código de un producto). */
export const SCAN_CODE_MAX_LENGTH = PRODUCT_CODE_MAX_LENGTH;
