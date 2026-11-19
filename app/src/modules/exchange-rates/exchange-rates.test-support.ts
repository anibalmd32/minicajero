import type { Database } from "bun:sqlite";
import { afterEach, beforeEach, spyOn } from "bun:test";
import { createTestDatabase } from "../../test-support/test-database";
import { type OfficialRate, RateApiError } from "./dolar-api.client";

let current: Database;
let warnSpy: ReturnType<typeof spyOn>;

export function useRatesDatabase(): void {
  beforeEach(() => {
    current = createTestDatabase();
    warnSpy = spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
    current.close();
  });
}

export function db(): Database {
  return current;
}

export const official =
  (rate: number, apiDate = "2026-10-29T04:00:00.000Z"): (() => Promise<OfficialRate>) =>
  async () => ({ rate, apiDate });

export const offline = async (): Promise<OfficialRate> => {
  throw new RateApiError("Sin conexión a internet o la API de tasas no está disponible");
};
