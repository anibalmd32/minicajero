import { X509Certificate } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { isIPv4 } from "node:net";
import { join } from "node:path";
import { type CertificatePair, createSelfSignedCertificate } from "./certificate";

/** Carpeta, dentro de la de datos, con el certificado, la clave y el puerto del servidor del teléfono. */
export const PHONE_DATA_DIR_NAME = "movil";

/** Archivo del certificado (PEM). */
export const CERTIFICATE_FILE = "certificado.pem";

/** Archivo de la clave privada (PEM). */
export const PRIVATE_KEY_FILE = "clave.pem";

const RENEW_BEFORE_MS = 30 * 24 * 60 * 60 * 1000;
const OWNER_ONLY = 0o600;
const MAX_CERTIFICATE_IPS = 16;
const SAN_IP_PREFIX = "IP Address:";

/** Carpeta del servidor del teléfono para una carpeta de datos. */
export function phoneDataDir(dataDir: string): string {
  return join(dataDir, PHONE_DATA_DIR_NAME);
}

/** Certificado cargado o recién creado. */
export interface StoredCertificate extends CertificatePair {
  created: boolean;
  /** IPv4 que cubre el certificado. */
  ips: string[];
}

function readPair(dir: string): CertificatePair | null {
  const certPath = join(dir, CERTIFICATE_FILE);
  const keyPath = join(dir, PRIVATE_KEY_FILE);
  if (!existsSync(certPath) || !existsSync(keyPath)) return null;
  try {
    return { cert: readFileSync(certPath, "utf8"), key: readFileSync(keyPath, "utf8") };
  } catch {
    return null;
  }
}

/** ¿El certificado sigue sirviendo: se puede leer, no vence en los próximos 30 días y cubre todas las `ips`? */
export function certificateCovers(pem: string, ips: readonly string[], now: Date = new Date()): boolean {
  try {
    const certificate = new X509Certificate(pem);
    if (new Date(certificate.validFrom).getTime() > now.getTime()) return false;
    if (new Date(certificate.validTo).getTime() - now.getTime() < RENEW_BEFORE_MS) return false;
    return ips.every((ip) => certificate.checkIP(ip) !== undefined);
  } catch {
    return false;
  }
}

/** IPv4 incluidas en el SubjectAltName del certificado (vacío si no se puede leer). */
export function certificateIps(pem: string): string[] {
  try {
    const entries = new X509Certificate(pem).subjectAltName?.split(", ") ?? [];
    return entries
      .flatMap((entry) => (entry.startsWith(SAN_IP_PREFIX) ? [entry.slice(SAN_IP_PREFIX.length)] : []))
      .filter((ip) => isIPv4(ip));
  } catch {
    return [];
  }
}

function writeAtomically(path: string, content: string, mode?: number): void {
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, content, mode === undefined ? undefined : { mode });
  renameSync(temporary, path);
}

/**
 * Devuelve el certificado guardado en `<datos>/movil/` si sigue sirviendo para las `ips` actuales; si no
 * (falta, está dañado, vence pronto o no incluye alguna IP), crea uno nuevo y lo guarda (la clave, solo legible
 * por el usuario donde el sistema lo permite). El nuevo cubre también las IP del anterior, para que el teléfono
 * no vuelva a ver el aviso de seguridad cada vez que la computadora cambia de red.
 */
export function loadOrCreateCertificate(
  dir: string,
  ips: readonly string[],
  now: Date = new Date(),
): StoredCertificate {
  const stored = readPair(dir);
  if (stored && certificateCovers(stored.cert, ips, now))
    return { ...stored, created: false, ips: certificateIps(stored.cert) };
  const previous = stored ? certificateIps(stored.cert) : [];
  const covered = [...new Set([...ips, ...previous])].slice(0, Math.max(ips.length, MAX_CERTIFICATE_IPS));
  const pair = createSelfSignedCertificate({ ips: covered, now });
  mkdirSync(dir, { recursive: true });
  writeAtomically(join(dir, PRIVATE_KEY_FILE), pair.key, OWNER_ONLY);
  writeAtomically(join(dir, CERTIFICATE_FILE), pair.cert);
  return { ...pair, created: true, ips: covered };
}
