import { expect, test } from "bun:test";
import { ConflictError } from "../../lib/http-errors";
import type { OfficialRate } from "./dolar-api.client";
import { countRates, findLatestRate } from "./exchange-rates.repository";
import { getCurrentRate, getRateOverview, STALE_AFTER_MS, syncOfficialRate } from "./exchange-rates.service";
import { db, official, offline, useRatesDatabase } from "./exchange-rates.test-support";

useRatesDatabase();

test("el resumen devuelve rate null y getCurrentRate lanza 409", () => {
  const overview = getRateOverview(db());
  expect(overview).toMatchObject({ rate: null, source: null, mode: "auto", api_date: null, updated_at: null });
  expect(overview.status).toMatchObject({ online: false, stale: true, last_attempt_at: null, last_error: null });
  expect(() => getCurrentRate(db())).toThrow(ConflictError);
});

test("registra la tasa oficial y marca online", async () => {
  const overview = await syncOfficialRate({ db: db(), fetchRate: official(888.8909) });
  expect(overview).toMatchObject({
    rate: 888.8909,
    source: "api",
    mode: "auto",
    api_date: "2026-10-29T04:00:00.000Z",
  });
  expect(overview.status.online).toBe(true);
  expect(overview.status.stale).toBe(false);
  expect((overview.status.last_success_at ?? "") >= (overview.status.last_attempt_at ?? "")).toBe(true);
  expect(getCurrentRate(db()).rate).toBe(888.8909);
});

test("no duplica si el valor y la fecha de la API no cambian; solo actualiza last_checked_at", async () => {
  await syncOfficialRate({ db: db(), fetchRate: official(36.5) });
  const first = findLatestRate("api", db());
  await Bun.sleep(5);
  await syncOfficialRate({ db: db(), fetchRate: official(36.5) });
  const second = findLatestRate("api", db());
  expect(countRates(db())).toBe(1);
  expect(second?.id).toBe(first?.id);
  expect((second?.last_checked_at ?? "") > (first?.last_checked_at ?? "")).toBe(true);
});

test("inserta un registro nuevo si cambia el valor o la fecha", async () => {
  await syncOfficialRate({ db: db(), fetchRate: official(36.5) });
  await syncOfficialRate({ db: db(), fetchRate: official(36.6) });
  await syncOfficialRate({ db: db(), fetchRate: official(36.6, "2026-10-30T04:00:00.000Z") });
  expect(countRates(db())).toBe(3);
  expect(getCurrentRate(db())).toMatchObject({ rate: 36.6, api_date: "2026-10-30T04:00:00.000Z" });
});

test("sin internet reporta offline sin romper y conserva la última tasa", async () => {
  await syncOfficialRate({ db: db(), fetchRate: official(40) });
  await Bun.sleep(5);
  const overview = await syncOfficialRate({ db: db(), fetchRate: offline });
  expect(overview.rate).toBe(40);
  expect(overview.status.online).toBe(false);
  expect(overview.status.last_error).toContain("Sin conexión");
  expect(overview.status.last_attempt_at).not.toBe(overview.status.last_success_at);
  const recovered = await syncOfficialRate({ db: db(), fetchRate: official(40) });
  expect(recovered.status).toMatchObject({ online: true, last_error: null });
});

test("un error inesperado se guarda con un mensaje genérico", async () => {
  const overview = await syncOfficialRate({
    db: db(),
    fetchRate: async () => {
      throw new Error("boom");
    },
  });
  expect(overview.status.last_error).toBe("No se pudo obtener la tasa oficial");
});

test("las sincronizaciones simultáneas comparten una sola consulta", async () => {
  let calls = 0;
  const slow = async (): Promise<OfficialRate> => {
    calls++;
    await Bun.sleep(10);
    return { rate: 50, apiDate: "2026-10-29T04:00:00.000Z" };
  };
  const [a, b] = await Promise.all([
    syncOfficialRate({ db: db(), fetchRate: slow }),
    syncOfficialRate({ db: db(), fetchRate: slow }),
  ]);
  expect(calls).toBe(1);
  expect(a.rate).toBe(50);
  expect(b.rate).toBe(50);
  expect(b.status.syncing).toBe(false);
});

test("stale cuando la última sincronización correcta tiene más de 6 h", async () => {
  await syncOfficialRate({ db: db(), fetchRate: official(40) });
  const later = Date.now() + STALE_AFTER_MS + 1000;
  expect(getRateOverview(db(), later).status.stale).toBe(true);
  expect(getRateOverview(db()).status.stale).toBe(false);
});
