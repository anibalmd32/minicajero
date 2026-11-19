const TAG_BOOLEAN = 0x01;
const TAG_INTEGER = 0x02;
const TAG_BIT_STRING = 0x03;
const TAG_OCTET_STRING = 0x04;
const TAG_OID = 0x06;
const TAG_UTF8_STRING = 0x0c;
const TAG_UTC_TIME = 0x17;
const TAG_GENERALIZED_TIME = 0x18;
const TAG_SEQUENCE = 0x30;
const TAG_SET = 0x31;
const CONTEXT_PRIMITIVE = 0x80;
const CONTEXT_CONSTRUCTED = 0xa0;
const UTC_TIME_LAST_YEAR = 2049;

function encodeLength(length: number): Uint8Array {
  if (length < 0x80) return Uint8Array.of(length);
  const bytes: number[] = [];
  for (let rest = length; rest > 0; rest = Math.floor(rest / 256)) bytes.unshift(rest % 256);
  return Uint8Array.of(0x80 | bytes.length, ...bytes);
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

/** Elemento TLV con la etiqueta y el contenido dados. */
export function tlv(tag: number, content: Uint8Array): Uint8Array {
  return concat([Uint8Array.of(tag), encodeLength(content.length), content]);
}

export function sequence(...items: Uint8Array[]): Uint8Array {
  return tlv(TAG_SEQUENCE, concat(items));
}

export function set(...items: Uint8Array[]): Uint8Array {
  return tlv(TAG_SET, concat(items));
}

export function boolean(value: boolean): Uint8Array {
  return tlv(TAG_BOOLEAN, Uint8Array.of(value ? 0xff : 0x00));
}

/** INTEGER positivo a partir de sus bytes en big-endian (quita ceros sobrantes y añade uno si haría falta para el signo). */
export function unsignedInteger(bytes: Uint8Array): Uint8Array {
  let start = 0;
  while (start < bytes.length - 1 && bytes[start] === 0) start++;
  const trimmed = bytes.length === 0 ? Uint8Array.of(0) : bytes.subarray(start);
  const content = (trimmed[0] ?? 0) & 0x80 ? concat([Uint8Array.of(0), trimmed]) : trimmed;
  return tlv(TAG_INTEGER, content);
}

export function smallInteger(value: number): Uint8Array {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`Entero DER no válido: ${value}`);
  const bytes: number[] = [];
  for (let rest = value; rest > 0; rest = Math.floor(rest / 256)) bytes.unshift(rest % 256);
  return unsignedInteger(Uint8Array.from(bytes));
}

function base128(value: number): number[] {
  const bytes = [value & 0x7f];
  for (let rest = Math.floor(value / 128); rest > 0; rest = Math.floor(rest / 128)) bytes.unshift(0x80 | (rest & 0x7f));
  return bytes;
}

/** OBJECT IDENTIFIER en notación con puntos (`2.5.4.3`). */
export function oid(dotted: string): Uint8Array {
  const arcs = dotted.split(".").map(Number);
  const [first, second, ...rest] = arcs;
  if (first === undefined || second === undefined || arcs.some((arc) => !Number.isSafeInteger(arc) || arc < 0)) {
    throw new RangeError(`OID no válido: ${dotted}`);
  }
  return tlv(TAG_OID, Uint8Array.from([...base128(first * 40 + second), ...rest.flatMap(base128)]));
}

export function octetString(content: Uint8Array): Uint8Array {
  return tlv(TAG_OCTET_STRING, content);
}

/** BIT STRING de bytes completos (sin bits sobrantes). */
export function bitString(content: Uint8Array): Uint8Array {
  return tlv(TAG_BIT_STRING, concat([Uint8Array.of(0), content]));
}

/** BIT STRING con los bits indicados encendidos (bit 0 = el más significativo del primer byte), en su forma DER mínima. */
export function namedBits(bits: readonly number[]): Uint8Array {
  if (bits.length === 0) return tlv(TAG_BIT_STRING, Uint8Array.of(0));
  const highest = Math.max(...bits);
  const bytes = new Uint8Array(Math.floor(highest / 8) + 1);
  for (const bit of bits) bytes[bit >> 3] = (bytes[bit >> 3] ?? 0) | (0x80 >> (bit & 7));
  const unusedBits = 7 - (highest & 7);
  return tlv(TAG_BIT_STRING, concat([Uint8Array.of(unusedBits), bytes]));
}

export function utf8String(text: string): Uint8Array {
  return tlv(TAG_UTF8_STRING, new TextEncoder().encode(text));
}

function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

/** Fecha X.509: UTCTime hasta 2049 y GeneralizedTime desde 2050, siempre en UTC y sin fracciones de segundo. */
export function time(date: Date): Uint8Array {
  const year = date.getUTCFullYear();
  const rest = [
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
  ]
    .map(twoDigits)
    .join("");
  const ascii = (text: string) => new TextEncoder().encode(text);
  if (year <= UTC_TIME_LAST_YEAR) return tlv(TAG_UTC_TIME, ascii(`${twoDigits(year % 100)}${rest}Z`));
  return tlv(TAG_GENERALIZED_TIME, ascii(`${String(year).padStart(4, "0")}${rest}Z`));
}

/** Etiqueta de contexto explícita (`[n]` construida) que envuelve un elemento. */
export function explicit(tagNumber: number, content: Uint8Array): Uint8Array {
  return tlv(CONTEXT_CONSTRUCTED | tagNumber, content);
}

/** Etiqueta de contexto implícita primitiva (`[n]`) con contenido en bruto. */
export function implicit(tagNumber: number, content: Uint8Array): Uint8Array {
  return tlv(CONTEXT_PRIMITIVE | tagNumber, content);
}
