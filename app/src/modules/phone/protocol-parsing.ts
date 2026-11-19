import { PRODUCT_CODE_PATTERN } from "../../lib/product-code";
import {
  SCAN_CODE_MAX_LENGTH,
  SCAN_STATUSES,
  SCAN_TARGET_PAGES,
  type ScanStatus,
  type ScanTargetPage,
} from "./protocol-constants";
import type {
  PcToServerMessage,
  PhoneToServerMessage,
  ServerToPcMessage,
  ServerToPhoneMessage,
} from "./protocol-messages";

const SCAN_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const SCAN_FORMAT_PATTERN = /^[a-z0-9_]{1,20}$/;
const MESSAGE_MAX_LENGTH = 200;
const DEVICE_MAX_LENGTH = 300;
const PAGE_PATTERN = /^[a-z0-9-]{1,40}$/;

/** Limpia un código leído (sin espacios en los extremos) y lo valida: ASCII imprimible y hasta 64 caracteres. `null` si no sirve. */
export function normalizeScanCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim();
  if (code.length === 0 || code.length > SCAN_CODE_MAX_LENGTH || !PRODUCT_CODE_PATTERN.test(code)) return null;
  return code;
}

/** Formato del código según `BarcodeDetector` (`ean_13`, `code_128`...); `unknown` si no viene o no es válido. */
export function normalizeScanFormat(raw: unknown): string {
  return typeof raw === "string" && SCAN_FORMAT_PATTERN.test(raw) ? raw : "unknown";
}

/** ¿La página de la PC puede recibir escaneos? */
export function isScanTargetPage(page: string): page is ScanTargetPage {
  return (SCAN_TARGET_PAGES as readonly string[]).includes(page);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  try {
    const data: unknown = JSON.parse(raw);
    return isRecord(data) ? data : null;
  } catch {
    return null;
  }
}

function parseHello(data: Record<string, unknown>): PhoneToServerMessage | null {
  if (typeof data.token !== "string" || typeof data.version !== "number") return null;
  return {
    type: "hello",
    version: data.version,
    token: data.token,
    ...(typeof data.device === "string" ? { device: data.device.slice(0, DEVICE_MAX_LENGTH) } : {}),
  };
}

function parseScan(data: Record<string, unknown>): PhoneToServerMessage | null {
  if (typeof data.id !== "string" || !SCAN_ID_PATTERN.test(data.id) || typeof data.code !== "string") return null;
  return {
    type: "scan",
    id: data.id,
    code: data.code.slice(0, SCAN_CODE_MAX_LENGTH * 2),
    format: normalizeScanFormat(data.format),
  };
}

/** Interpreta un mensaje del teléfono. `null` si no es un mensaje válido del protocolo (el código del escaneo se valida aparte). */
export function parsePhoneMessage(raw: string): PhoneToServerMessage | null {
  const data = parseJsonObject(raw);
  if (!data) return null;
  if (data.type === "hello") return parseHello(data);
  if (data.type === "scan") return parseScan(data);
  if (data.type === "bye") return { type: "bye" };
  return null;
}

function isScanStatus(value: unknown): value is ScanStatus {
  return typeof value === "string" && (SCAN_STATUSES as readonly string[]).includes(value);
}

function parseFocus(data: Record<string, unknown>): PcToServerMessage | null {
  if (typeof data.page !== "string" || !PAGE_PATTERN.test(data.page) || typeof data.visible !== "boolean") return null;
  return { type: "focus", page: data.page, visible: data.visible };
}

function parseScanResult(data: Record<string, unknown>): PcToServerMessage | null {
  if (typeof data.id !== "string" || !isScanStatus(data.status) || typeof data.message !== "string") return null;
  return {
    type: "scan-result",
    id: data.id,
    status: data.status,
    message: data.message.trim().slice(0, MESSAGE_MAX_LENGTH),
  };
}

/** Interpreta un mensaje de una pestaña de la PC. `null` si no es válido. */
export function parsePcMessage(raw: string): PcToServerMessage | null {
  const data = parseJsonObject(raw);
  if (!data) return null;
  if (data.type === "focus") return parseFocus(data);
  if (data.type === "scan-result") return parseScanResult(data);
  return null;
}

function parseTypedMessage(raw: string): Record<string, unknown> | null {
  const data = parseJsonObject(raw);
  return data && typeof data.type === "string" ? data : null;
}

/** Interpreta un mensaje del servidor en el teléfono. `null` si no es válido. */
export function parseServerToPhoneMessage(raw: string): ServerToPhoneMessage | null {
  return parseTypedMessage(raw) as unknown as ServerToPhoneMessage | null;
}

/** Interpreta un mensaje del servidor en una pestaña de la PC. `null` si no es válido. */
export function parseServerToPcMessage(raw: string): ServerToPcMessage | null {
  return parseTypedMessage(raw) as unknown as ServerToPcMessage | null;
}
