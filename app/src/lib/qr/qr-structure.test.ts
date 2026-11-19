import { expect, test } from "bun:test";
import { encodeQr } from "./encode";
import { qrMatrix } from "./index";
import { MASK_PATTERNS, penaltyScore } from "./matrix";
import { moduleAt, picture, readFormat } from "./qr.test-support";

const FINDER_ROWS = ["#######", "#.....#", "#.###.#", "#.###.#", "#.###.#", "#.....#", "#######"];

test("patrones de posición, temporización y módulo oscuro", () => {
  const { modules, size } = qrMatrix("https://192.168.1.25:4802/movil#token");
  for (const [top, left] of [
    [0, 0],
    [0, size - 7],
    [size - 7, 0],
  ] as const) {
    const finder = modules.slice(top, top + 7).map((row) => row.slice(left, left + 7));
    expect(picture(finder)).toEqual(FINDER_ROWS);
  }
  for (let index = 8; index < size - 8; index++) {
    expect(moduleAt(modules, 6, index)).toBe(index % 2 === 0);
    expect(moduleAt(modules, index, 6)).toBe(index % 2 === 0);
  }
  expect(moduleAt(modules, size - 8, 8)).toBe(true);
});

test("la información de formato codifica el nivel y la máscara, y su BCH es válido", () => {
  for (const mask of MASK_PATTERNS) {
    const format = readFormat(encodeQr("MiniCajero", { mask }).modules);
    expect(format >>> 10).toBe(mask);
    let remainder = format;
    for (let bit = 14; bit >= 10; bit--) if ((remainder >>> bit) & 1) remainder ^= 0x537 << (bit - 10);
    expect(remainder).toBe(0);
  }
});

test("la información de versión aparece desde la versión 7", () => {
  const { modules, size } = encodeQr("a", { version: 7 });
  let bits = 0;
  for (let index = 0; index < 18; index++)
    if (moduleAt(modules, Math.floor(index / 3), size - 11 + (index % 3))) bits |= 1 << index;
  expect(bits).toBe(0x07c94);
});

test("elige la máscara de menor penalización", () => {
  const text = "https://192.168.1.25:4802/movil#Zx8kQ2vL9pRt4mWn7bYc3hFd6jGs1aEu";
  const chosen = qrMatrix(text);
  const penalties = MASK_PATTERNS.map((mask) => penaltyScore(encodeQr(text, { mask }).modules));
  expect(penaltyScore(chosen.modules)).toBe(Math.min(...penalties));
  expect(penalties.indexOf(Math.min(...penalties))).toBe(chosen.mask);
});
