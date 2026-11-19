import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CERTIFICATE_FILE,
  certificateCovers,
  certificateIps,
  loadOrCreateCertificate,
  PRIVATE_KEY_FILE,
} from "./certificate-store";

const DAY_MS = 24 * 60 * 60 * 1000;
const directories: string[] = [];

function newStoreDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "minicajero-cert-"));
  directories.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true });
});

test("lo crea, lo reutiliza y lo renueva si aparece una IP nueva", () => {
  const dir = newStoreDir();
  const first = loadOrCreateCertificate(dir, ["192.168.1.10"]);
  expect(first.created).toBe(true);
  expect(readFileSync(join(dir, CERTIFICATE_FILE), "utf8")).toBe(first.cert);
  expect(readFileSync(join(dir, PRIVATE_KEY_FILE), "utf8")).toBe(first.key);

  const again = loadOrCreateCertificate(dir, ["192.168.1.10"]);
  expect(again.created).toBe(false);
  expect(again.cert).toBe(first.cert);

  const renewed = loadOrCreateCertificate(dir, ["192.168.1.10", "10.0.0.7"]);
  expect(renewed.created).toBe(true);
  expect(certificateCovers(renewed.cert, ["192.168.1.10", "10.0.0.7"])).toBe(true);
});

test("al renovarlo conserva las IP del anterior", () => {
  const dir = newStoreDir();
  const first = loadOrCreateCertificate(dir, ["192.168.1.10"]);
  expect(first.ips).toEqual(["192.168.1.10"]);
  const renewed = loadOrCreateCertificate(dir, ["10.0.0.7"]);
  expect(renewed.created).toBe(true);
  expect(renewed.ips).toEqual(["10.0.0.7", "192.168.1.10"]);
  expect(certificateIps(renewed.cert)).toEqual(["10.0.0.7", "192.168.1.10"]);
  const back = loadOrCreateCertificate(dir, ["192.168.1.10"]);
  expect(back.created).toBe(false);
  expect(back.ips).toEqual(["10.0.0.7", "192.168.1.10"]);
});

test("lo renueva si está dañado o a punto de vencer", () => {
  const dir = newStoreDir();
  const first = loadOrCreateCertificate(dir, ["192.168.1.10"]);
  expect(certificateCovers(first.cert, ["192.168.1.10"], new Date(Date.now() + 3640 * DAY_MS))).toBe(false);
  writeFileSync(join(dir, CERTIFICATE_FILE), "dañado");
  expect(loadOrCreateCertificate(dir, ["192.168.1.10"]).created).toBe(true);
});
