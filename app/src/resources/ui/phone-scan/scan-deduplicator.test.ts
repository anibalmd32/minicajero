import { expect, test } from "bun:test";
import { ScanDeduplicator } from "./scan-deduplicator";

function sightEvery(dedup: ScanDeduplicator, code: string, from: number, to: number, stepMs = 150): number[] {
  const sent: number[] = [];
  for (let now = from; now <= to; now += stepMs) if (dedup.accept(code, now)) sent.push(now);
  return sent;
}

test("envía un código una sola vez mientras sigue delante de la cámara", () => {
  const dedup = new ScanDeduplicator();
  expect(sightEvery(dedup, "7591234567890", 0, 10_000)).toEqual([0]);
});

test("tolera fotogramas sin lectura sin volver a enviar", () => {
  const dedup = new ScanDeduplicator();
  expect(dedup.accept("123", 0)).toBe(true);
  expect(dedup.accept("123", 900)).toBe(false);
  expect(dedup.accept("123", 2000)).toBe(false);
  expect(dedup.accept("123", 3100)).toBe(false);
});

test("al apartarlo y volver a acercarlo lo envía otra vez para sumar unidades", () => {
  const dedup = new ScanDeduplicator();
  expect(sightEvery(dedup, "123", 0, 600)).toEqual([0]);
  expect(sightEvery(dedup, "123", 2500, 3000)).toEqual([2500]);
});

test("si vuelve demasiado pronto espera a que pasen 2 s desde el envío", () => {
  const dedup = new ScanDeduplicator();
  expect(dedup.accept("123", 0)).toBe(true);
  expect(dedup.accept("123", 1300)).toBe(false);
  expect(dedup.accept("123", 1900)).toBe(false);
  expect(dedup.accept("123", 2050)).toBe(true);
  expect(dedup.accept("123", 2200)).toBe(false);
});

test("dos códigos a la vista a la vez se envían una vez cada uno", () => {
  const dedup = new ScanDeduplicator();
  const sent: string[] = [];
  for (let now = 0; now < 5000; now += 150) {
    const code = (now / 150) % 2 === 0 ? "AAA" : "BBB";
    if (dedup.accept(code, now)) sent.push(code);
  }
  expect(sent).toEqual(["AAA", "BBB"]);
});

test("un código distinto se envía enseguida", () => {
  const dedup = new ScanDeduplicator();
  expect(dedup.accept("111", 0)).toBe(true);
  expect(dedup.accept("222", 100)).toBe(true);
});

test("reset permite enviar de nuevo el código a la vista", () => {
  const dedup = new ScanDeduplicator();
  expect(dedup.accept("123", 0)).toBe(true);
  dedup.reset();
  expect(dedup.accept("123", 150)).toBe(true);
});
