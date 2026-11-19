import { createHash, generateKeyPairSync, type KeyObject, randomBytes, sign } from "node:crypto";
import { isIPv4 } from "node:net";
import {
  bitString,
  boolean,
  explicit,
  implicit,
  namedBits,
  octetString,
  oid,
  sequence,
  set,
  smallInteger,
  time,
  unsignedInteger,
  utf8String,
} from "./der";

/** Nombre común (CN) del certificado del servidor del teléfono. */
export const CERTIFICATE_COMMON_NAME = "MiniCajero";

const OID_ECDSA_WITH_SHA256 = "1.2.840.10045.4.3.2";
const OID_COMMON_NAME = "2.5.4.3";
const OID_ORGANIZATION = "2.5.4.10";
const OID_SUBJECT_KEY_IDENTIFIER = "2.5.29.14";
const OID_KEY_USAGE = "2.5.29.15";
const OID_SUBJECT_ALT_NAME = "2.5.29.17";
const OID_BASIC_CONSTRAINTS = "2.5.29.19";
const OID_EXT_KEY_USAGE = "2.5.29.37";
const OID_SERVER_AUTH = "1.3.6.1.5.5.7.3.1";
const X509_VERSION_3 = 2;
const KEY_USAGE_DIGITAL_SIGNATURE = 0;
const SAN_DNS_NAME = 2;
const SAN_IP_ADDRESS = 7;
const SERIAL_BYTES = 16;
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_VALIDITY_DAYS = 3650;
const BACKDATE_MS = DAY_MS;

/** Datos para generar el certificado autofirmado. */
export interface CertificateOptions {
  /** IPv4 que el certificado debe cubrir (SubjectAltName). */
  ips: readonly string[];
  /** Nombres de host que debe cubrir (por defecto solo `localhost`). */
  hostnames?: readonly string[];
  now?: Date;
  validityDays?: number;
}

/** Certificado y clave privada en PEM, listos para `Bun.serve({ tls })`. */
export interface CertificatePair {
  cert: string;
  key: string;
}

function ipv4Bytes(ip: string): Uint8Array {
  if (!isIPv4(ip)) throw new RangeError(`IPv4 no válida: ${ip}`);
  return Uint8Array.from(ip.split(".").map(Number));
}

function distinguishedName(): Uint8Array {
  return sequence(
    set(sequence(oid(OID_ORGANIZATION), utf8String(CERTIFICATE_COMMON_NAME))),
    set(sequence(oid(OID_COMMON_NAME), utf8String(CERTIFICATE_COMMON_NAME))),
  );
}

function extension(id: string, critical: boolean, value: Uint8Array): Uint8Array {
  return critical ? sequence(oid(id), boolean(true), octetString(value)) : sequence(oid(id), octetString(value));
}

function subjectAltName(hostnames: readonly string[], ips: readonly string[]): Uint8Array {
  const ascii = new TextEncoder();
  return sequence(
    ...hostnames.map((name) => implicit(SAN_DNS_NAME, ascii.encode(name))),
    ...ips.map((ip) => implicit(SAN_IP_ADDRESS, ipv4Bytes(ip))),
  );
}

function keyIdentifier(spki: Uint8Array): Uint8Array {
  return createHash("sha1").update(spki).digest();
}

function extensions(spki: Uint8Array, hostnames: readonly string[], ips: readonly string[]): Uint8Array {
  return explicit(
    3,
    sequence(
      extension(OID_BASIC_CONSTRAINTS, true, sequence()),
      extension(OID_KEY_USAGE, true, namedBits([KEY_USAGE_DIGITAL_SIGNATURE])),
      extension(OID_EXT_KEY_USAGE, false, sequence(oid(OID_SERVER_AUTH))),
      extension(OID_SUBJECT_ALT_NAME, false, subjectAltName(hostnames, ips)),
      extension(OID_SUBJECT_KEY_IDENTIFIER, false, octetString(keyIdentifier(spki))),
    ),
  );
}

function positiveSerial(): Uint8Array {
  const serial = randomBytes(SERIAL_BYTES);
  serial[0] = ((serial[0] ?? 0) & 0x7f) | 0x01;
  return serial;
}

function toPem(label: string, der: Uint8Array): string {
  const base64 = Buffer.from(der).toString("base64");
  const lines = base64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----\n`;
}

function tbsCertificate(spki: Uint8Array, options: Required<CertificateOptions>): Uint8Array {
  const notBefore = new Date(options.now.getTime() - BACKDATE_MS);
  const notAfter = new Date(options.now.getTime() + options.validityDays * DAY_MS);
  const name = distinguishedName();
  return sequence(
    explicit(0, smallInteger(X509_VERSION_3)),
    unsignedInteger(positiveSerial()),
    sequence(oid(OID_ECDSA_WITH_SHA256)),
    name,
    sequence(time(notBefore), time(notAfter)),
    name,
    spki,
    extensions(spki, options.hostnames, options.ips),
  );
}

/**
 * Crea un par de claves EC P-256 y un certificado X.509 v3 autofirmado (ecdsa-with-SHA256) para servir HTTPS
 * en la red local: CN "MiniCajero", SubjectAltName con `hostnames` e `ips`, CA:false, uso de clave
 * digitalSignature y uso extendido serverAuth. Validez por defecto de 10 años (desde un día antes).
 */
export function createSelfSignedCertificate(options: CertificateOptions): CertificatePair {
  const settings: Required<CertificateOptions> = {
    ips: [...new Set(options.ips)],
    hostnames: [...new Set(options.hostnames ?? ["localhost"])],
    now: options.now ?? new Date(),
    validityDays: options.validityDays ?? DEFAULT_VALIDITY_DAYS,
  };
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const spki = new Uint8Array(publicKey.export({ type: "spki", format: "der" }));
  const tbs = tbsCertificate(spki, settings);
  const signature = signTbs(tbs, privateKey);
  const certificate = sequence(tbs, sequence(oid(OID_ECDSA_WITH_SHA256)), bitString(signature));
  return {
    cert: toPem("CERTIFICATE", certificate),
    key: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  };
}

function signTbs(tbs: Uint8Array, privateKey: KeyObject): Uint8Array {
  return new Uint8Array(sign("sha256", tbs, { key: privateKey, dsaEncoding: "der" }));
}
