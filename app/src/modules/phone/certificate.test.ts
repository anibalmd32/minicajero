import { expect, test } from "bun:test";
import { X509Certificate } from "node:crypto";
import { createSelfSignedCertificate } from "./certificate";

const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date(Date.UTC(2026, 9, 29, 12, 0, 0));
const pair = createSelfSignedCertificate({ ips: ["192.168.1.10", "10.0.0.5", "192.168.1.10"], now });
const certificate = new X509Certificate(pair.cert);

test("el certificado autofirmado se puede leer y su firma es válida", () => {
  expect(certificate.subject).toContain("CN=MiniCajero");
  expect(certificate.issuer).toBe(certificate.subject);
  expect(certificate.verify(certificate.publicKey)).toBe(true);
  expect(certificate.publicKey.asymmetricKeyDetails?.namedCurve).toBe("prime256v1");
});

test("cubre localhost y las IP indicadas, sin repetir", () => {
  expect(certificate.subjectAltName).toBe("DNS:localhost, IP Address:192.168.1.10, IP Address:10.0.0.5");
  expect(certificate.checkIP("10.0.0.5")).toBe("10.0.0.5");
  expect(certificate.checkIP("192.168.1.11")).toBeUndefined();
  expect(certificate.checkHost("localhost")).toBe("localhost");
});

test("no es CA, sirve para autenticar servidores y dura unos 10 años", () => {
  expect(certificate.ca).toBe(false);
  expect(certificate.keyUsage).toEqual(["1.3.6.1.5.5.7.3.1"]);
  expect(new Date(certificate.validFrom).getTime()).toBe(now.getTime() - DAY_MS);
  expect(new Date(certificate.validTo).getUTCFullYear()).toBe(2036);
});

test("cada certificado tiene su propio número de serie y clave", () => {
  const other = new X509Certificate(createSelfSignedCertificate({ ips: ["192.168.1.10"], now }).cert);
  expect(other.serialNumber).not.toBe(certificate.serialNumber);
  expect(other.verify(certificate.publicKey)).toBe(false);
});

test("rechaza direcciones que no son IPv4", () => {
  expect(() => createSelfSignedCertificate({ ips: ["no-es-ip"] })).toThrow(RangeError);
});

test("Bun lo usa como certificado TLS", async () => {
  const server = Bun.serve({ hostname: "127.0.0.1", port: 0, tls: pair, fetch: () => new Response("hola") });
  try {
    const response = await fetch(`https://127.0.0.1:${server.port}/`, { tls: { rejectUnauthorized: false } });
    expect(await response.text()).toBe("hola");
    await expect(fetch(`https://127.0.0.1:${server.port}/`)).rejects.toThrow();
  } finally {
    await server.stop(true);
  }
});
