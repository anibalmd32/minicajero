import { expect, test } from "bun:test";
import { qrMatrix, qrToSvg } from "./index";

test("SVG escalable con fondo blanco, bordes nítidos y margen de 4 módulos", () => {
  const svg = qrToSvg("HELLO WORLD");
  expect(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29 29" shape-rendering="crispEdges"'),
  ).toBe(true);
  expect(svg).toContain('<rect width="29" height="29" fill="#fff"/>');
  expect(svg).not.toMatch(/\swidth="\d+"\s[^>]*viewBox/);
  expect(svg).toContain('aria-hidden="true"');
});

test("los trazos cubren exactamente los módulos oscuros, desplazados por el margen", () => {
  const { modules } = qrMatrix("HELLO WORLD");
  const svg = qrToSvg("HELLO WORLD", { margin: 2 });
  expect(svg).toContain('viewBox="0 0 25 25"');
  const covered = new Set<string>();
  for (const [, x, y, length] of svg.matchAll(/M(\d+) (\d+)h(\d+)v1h-\3z/g)) {
    for (let offset = 0; offset < Number(length); offset++) covered.add(`${Number(y) - 2},${Number(x) - 2 + offset}`);
  }
  const dark = modules.flatMap((row, rowIndex) =>
    row.flatMap((isDark, column) => (isDark ? [`${rowIndex},${column}`] : [])),
  );
  expect([...covered].sort()).toEqual(dark.sort());
});

test("título accesible escapado y margen inválido", () => {
  const svg = qrToSvg("x", { title: 'Escanea "esto" & <ya>' });
  expect(svg).toContain('role="img" aria-label="Escanea &#34;esto&#34; &#38; &#60;ya&#62;"');
  expect(svg).toContain("<title>Escanea &#34;esto&#34; &#38; &#60;ya&#62;</title>");
  expect(() => qrToSvg("x", { margin: -1 })).toThrow(RangeError);
});
