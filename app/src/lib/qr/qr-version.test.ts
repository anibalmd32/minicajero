import { expect, test } from "bun:test";
import { encodeQr, QrTooLongError } from "./encode";
import { qrMatrix } from "./index";
import type { MaskPattern } from "./matrix";
import { BYTE_CAPACITY_L, BYTE_CAPACITY_M } from "./qr-vectors";
import { MAX_VERSION, symbolSize } from "./tables";

test("usa M en la versión más pequeña donde cabe (límites de las versiones 1 a 10)", () => {
  BYTE_CAPACITY_M.forEach((capacity, index) => {
    const version = index + 1;
    expect(qrMatrix("a".repeat(capacity))).toMatchObject({
      version,
      errorCorrection: "M",
      size: symbolSize(version),
    });
    expect(qrMatrix("a".repeat(capacity + 1)).version).toBe(version + 1);
  });
});

test("límites en nivel L para las versiones 1 a 10", () => {
  BYTE_CAPACITY_L.forEach((capacity, index) => {
    expect(encodeQr("a".repeat(capacity), { levels: ["L"] }).version).toBe(index + 1);
    expect(encodeQr("a".repeat(capacity + 1), { levels: ["L"] }).version).toBe(index + 2);
  });
});

test("pasa a L solo cuando no cabe en M", () => {
  expect(qrMatrix("a".repeat(2331))).toMatchObject({ version: MAX_VERSION, errorCorrection: "M" });
  const overflow = qrMatrix("a".repeat(2332));
  expect(overflow.errorCorrection).toBe("L");
  expect(() => encodeQr("a".repeat(2332), { levels: ["L"], version: overflow.version - 1 })).toThrow(QrTooLongError);
  expect(qrMatrix("a".repeat(2953))).toMatchObject({ version: MAX_VERSION, errorCorrection: "L" });
});

test("cuenta los bytes UTF-8 y la cabecera ECI", () => {
  expect(qrMatrix(`${"ñ".repeat(6)}a`).version).toBe(1);
  expect(qrMatrix("ñ".repeat(7)).version).toBe(2);
  expect(qrMatrix("a".repeat(14)).version).toBe(1);
});

test("una URL de emparejamiento cabe en una versión pequeña con nivel M", () => {
  const qr = qrMatrix("https://192.168.100.200:48020/movil#Zx8kQ2vL9pRt4mWn7bYc3hFd6jGs1aEu");
  expect(qr.errorCorrection).toBe("M");
  expect(qr.version).toBeLessThanOrEqual(6);
});

test("error claro si el texto no cabe", () => {
  expect(() => qrMatrix("a".repeat(2954))).toThrow(QrTooLongError);
  expect(() => qrMatrix("a".repeat(2954))).toThrow("demasiado largo");
  expect(() => encodeQr("a".repeat(15), { levels: ["M"], version: 1 })).toThrow(QrTooLongError);
  expect(() => encodeQr("a", { version: 41 })).toThrow(RangeError);
  expect(() => encodeQr("a", { mask: 9 as MaskPattern })).toThrow("Máscara de QR no válida");
});
