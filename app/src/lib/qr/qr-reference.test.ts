import { expect, test } from "bun:test";
import { encodeQr } from "./encode";
import { picture } from "./qr.test-support";
import { HELLO_WORLD_V1_M_MASK2, PINA_UTF8_V1_M_MASK5 } from "./qr-vectors";
import { alignmentPositions, blockLayout, rawDataModules, symbolSize } from "./tables";

test("HELLO WORLD en modo byte, versión 1-M, máscara 2", () => {
  const qr = encodeQr("HELLO WORLD", { levels: ["M"], mask: 2 });
  expect(qr.version).toBe(1);
  expect(picture(qr.modules)).toEqual(HELLO_WORLD_V1_M_MASK2);
});

test("texto con tildes en UTF-8 con ECI, versión 1-M, máscara 5", () => {
  const qr = encodeQr("Piña", { levels: ["M"], mask: 5 });
  expect(qr.version).toBe(1);
  expect(picture(qr.modules)).toEqual(PINA_UTF8_V1_M_MASK5);
});

test("tablas: lado del símbolo, módulos de datos y codewords", () => {
  expect(symbolSize(1)).toBe(21);
  expect(symbolSize(40)).toBe(177);
  expect(rawDataModules(1)).toBe(208);
  expect(rawDataModules(7)).toBe(1568);
  expect(blockLayout(1, "M")).toEqual({ totalCodewords: 26, blockCount: 1, eccPerBlock: 10, dataCodewords: 16 });
  expect(blockLayout(5, "Q")).toEqual({ totalCodewords: 134, blockCount: 4, eccPerBlock: 18, dataCodewords: 62 });
  expect(blockLayout(40, "L").dataCodewords).toBe(2956);
});

test("tablas: posiciones de los patrones de alineación", () => {
  expect(alignmentPositions(1)).toEqual([]);
  expect(alignmentPositions(2)).toEqual([6, 18]);
  expect(alignmentPositions(7)).toEqual([6, 22, 38]);
  expect(alignmentPositions(32)).toEqual([6, 34, 60, 86, 112, 138]);
  expect(alignmentPositions(40)).toEqual([6, 30, 58, 86, 114, 142, 170]);
});
