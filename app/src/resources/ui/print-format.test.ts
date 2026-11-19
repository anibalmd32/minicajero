import { describe, expect, test } from "bun:test";
import { isPrintFormat, pageRule, parsePrintFormat, ticketPageHeightMm } from "./print-format";

describe("parsePrintFormat", () => {
  test("acepta los valores de la URL y los guardados", () => {
    expect(parsePrintFormat("carta")).toBe("letter");
    expect(parsePrintFormat(" A4 ")).toBe("a4");
    expect(parsePrintFormat("Ticket")).toBe("ticket");
    expect(parsePrintFormat("letter")).toBe("letter");
  });

  test("rechaza valores desconocidos o vacíos", () => {
    expect(parsePrintFormat("oficio")).toBeNull();
    expect(parsePrintFormat("")).toBeNull();
    expect(parsePrintFormat(null)).toBeNull();
    expect(parsePrintFormat(undefined)).toBeNull();
  });
});

describe("isPrintFormat", () => {
  test("solo admite los formatos internos", () => {
    expect(isPrintFormat("a4")).toBe(true);
    expect(isPrintFormat("carta")).toBe(false);
    expect(isPrintFormat(3)).toBe(false);
  });
});

describe("ticketPageHeightMm", () => {
  test("convierte píxeles CSS a milímetros con margen de seguridad", () => {
    expect(ticketPageHeightMm(960)).toBe(258);
  });

  test("nunca baja del mínimo ni acepta valores inválidos", () => {
    expect(ticketPageHeightMm(100)).toBe(80);
    expect(ticketPageHeightMm(Number.NaN)).toBe(80);
    expect(ticketPageHeightMm(-5)).toBe(80);
  });
});

describe("pageRule", () => {
  test("usa el tamaño de papel de cada formato", () => {
    expect(pageRule("letter")).toContain("size: letter portrait");
    expect(pageRule("a4")).toContain("size: A4 portrait");
    expect(pageRule("ticket", 150)).toBe("@page { size: 80mm 150mm; margin: 4mm; }");
  });
});
