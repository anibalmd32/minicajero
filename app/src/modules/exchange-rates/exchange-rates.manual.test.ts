import { expect, test } from "bun:test";
import { BadRequestError, ConflictError } from "../../lib/http-errors";
import { countRates, listRates } from "./exchange-rates.repository";
import { getCurrentRate, getRateHistory, setManualRate, setRateMode, syncOfficialRate } from "./exchange-rates.service";
import { db, official, offline, useRatesDatabase } from "./exchange-rates.test-support";

useRatesDatabase();

test("fijar tasa manual inserta registro manual y pasa a modo manual", async () => {
  await syncOfficialRate({ db: db(), fetchRate: official(40) });
  const overview = setManualRate({ rate: 41.1234 }, db());
  expect(overview).toMatchObject({ rate: 41.1234, source: "manual", mode: "manual", api_date: null });
  await syncOfficialRate({ db: db(), fetchRate: official(42) });
  expect(getCurrentRate(db())).toMatchObject({ rate: 41.1234, source: "manual" });
});

test("volver a auto usa la última tasa oficial", async () => {
  await syncOfficialRate({ db: db(), fetchRate: official(40) });
  setManualRate({ rate: 45 }, db());
  const overview = await setRateMode({ mode: "auto" }, { db: db(), fetchRate: offline });
  expect(overview).toMatchObject({ rate: 40, source: "api", mode: "auto" });
});

test("volver a auto sin tasa oficial intenta sincronizar; si falla usa la manual", async () => {
  setManualRate({ rate: 45 }, db());
  const failed = await setRateMode({ mode: "auto" }, { db: db(), fetchRate: offline });
  expect(failed).toMatchObject({ rate: 45, source: "manual", mode: "auto" });
  expect(failed.status.online).toBe(false);
  setManualRate({ rate: 45 }, db());
  const synced = await setRateMode({ mode: "auto" }, { db: db(), fetchRate: official(46) });
  expect(synced).toMatchObject({ rate: 46, source: "api", mode: "auto" });
});

test("validaciones de la tasa manual", () => {
  for (const rate of [0, -1, "40", null, 40.12345, 2e9]) {
    expect(() => setManualRate({ rate }, db())).toThrow(BadRequestError);
  }
  expect(countRates(db())).toBe(0);
});

test("modo inválido -> 400; manual sin tasa manual -> 409", async () => {
  await expect(setRateMode({ mode: "otro" }, { db: db() })).rejects.toBeInstanceOf(BadRequestError);
  await expect(setRateMode({ mode: "manual" }, { db: db() })).rejects.toBeInstanceOf(ConflictError);
});

test("pagina del más reciente al más antiguo", async () => {
  await syncOfficialRate({ db: db(), fetchRate: official(40) });
  setManualRate({ rate: 41 }, db());
  setManualRate({ rate: 42 }, db());
  const page = getRateHistory({ limit: 2, offset: 0 }, db());
  expect(page.total).toBe(3);
  expect(page.items.map((r) => r.rate)).toEqual([42, 41]);
  expect(getRateHistory({ limit: 2, offset: 2 }, db()).items.map((r) => r.rate)).toEqual([40]);
  expect(listRates(10, 0, db()).length).toBe(3);
});
