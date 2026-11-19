import { expect, test } from "bun:test";
import { pickBarcodeFormats, pickDetectedCode } from "./barcode-formats";
import { cameraProblemFromError, canRetryCamera } from "./camera-problems";

test("pickBarcodeFormats se queda con los formatos deseados que el navegador soporta, en orden", () => {
  expect(pickBarcodeFormats(["qr_code", "itf", "ean_13", "aztec", "code_128"])).toEqual(["ean_13", "code_128", "itf"]);
});

test("pickBarcodeFormats sin formatos útiles devuelve una lista vacía", () => {
  expect(pickBarcodeFormats(["qr_code", "pdf417"])).toEqual([]);
  expect(pickBarcodeFormats([])).toEqual([]);
});

test("traduce los errores de getUserMedia", () => {
  expect(cameraProblemFromError(new DOMException("x", "NotAllowedError"))).toBe("denied");
  expect(cameraProblemFromError({ name: "NotFoundError" })).toBe("missing");
  expect(cameraProblemFromError({ name: "NotReadableError" })).toBe("busy");
  expect(cameraProblemFromError(new Error("x"))).toBe("failed");
  expect(cameraProblemFromError(null)).toBe("failed");
});

test("solo se reintenta la cámara cuando puede funcionar", () => {
  expect(canRetryCamera("denied")).toBe(true);
  expect(canRetryCamera("unsupported")).toBe(false);
  expect(canRetryCamera("insecure")).toBe(false);
});

test("elige el código más grande del fotograma e ignora los vacíos", () => {
  const small = { rawValue: "1", format: "ean_8", boundingBox: { width: 10, height: 10 } };
  const big = { rawValue: "2", format: "ean_13", boundingBox: { width: 100, height: 40 } };
  const blank = { rawValue: "  ", format: "ean_13", boundingBox: { width: 500, height: 500 } };
  expect(pickDetectedCode([small, blank, big])).toBe(big);
  expect(pickDetectedCode([])).toBeNull();
});
