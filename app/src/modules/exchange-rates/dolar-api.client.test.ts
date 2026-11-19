import { afterAll, expect, test } from "bun:test";
import {
  DEFAULT_RATE_API_URL,
  fetchOfficialRate,
  parseOfficialRate,
  RateApiError,
  resolveRateApiUrl,
} from "./dolar-api.client";

const SAMPLE = [
  { moneda: "USD", fuente: "oficial", promedio: 888.8909, fechaActualizacion: "2026-10-29T00:00:00-04:00" },
  { moneda: "USD", fuente: "paralelo", promedio: 999.255881, fechaActualizacion: "2026-10-29T19:01:29.690Z" },
];

function startSampleServer() {
  return Bun.serve({
    port: 0,
    routes: {
      "/ok": () => Response.json(SAMPLE),
      "/error": () => new Response("caída", { status: 503 }),
      "/html": () => new Response("<html>", { headers: { "content-type": "text/html" } }),
      "/slow": async () => {
        await Bun.sleep(300);
        return Response.json(SAMPLE);
      },
    },
  });
}

const server = startSampleServer();
const base = server.url.href.replace(/\/$/, "");

afterAll(() => server.stop(true));

test("parseOfficialRate toma el promedio de la fuente oficial y normaliza la fecha a UTC", () => {
  expect(parseOfficialRate(SAMPLE)).toEqual({ rate: 888.8909, apiDate: "2026-10-29T04:00:00.000Z" });
});

test("parseOfficialRate redondea la tasa a 4 decimales", () => {
  expect(parseOfficialRate([{ ...SAMPLE[0], promedio: 36.123456 }]).rate).toBe(36.1235);
});

test.each([
  [{}, "Respuesta inesperada"],
  [[SAMPLE[1]], "no incluye la tasa oficial"],
  [[{ ...SAMPLE[0], promedio: null }], "tasa oficial inválida"],
  [[{ ...SAMPLE[0], promedio: 0 }], "tasa oficial inválida"],
  [[{ ...SAMPLE[0], fechaActualizacion: "ayer" }], "fecha de actualización inválida"],
])("parseOfficialRate rechaza %p", (payload, message) => {
  expect(() => parseOfficialRate(payload)).toThrow(message);
});

test("resolveRateApiUrl usa la variable de entorno si existe", () => {
  expect(resolveRateApiUrl({})).toBe(DEFAULT_RATE_API_URL);
  expect(resolveRateApiUrl({ MINICAJERO_RATE_API_URL: " http://x/y " })).toBe("http://x/y");
});

test("fetchOfficialRate: respuesta válida", async () => {
  expect(await fetchOfficialRate(`${base}/ok`)).toEqual({ rate: 888.8909, apiDate: "2026-10-29T04:00:00.000Z" });
});

test("fetchOfficialRate: estado HTTP de error", async () => {
  await expect(fetchOfficialRate(`${base}/error`)).rejects.toThrow("estado 503");
});

test("fetchOfficialRate: cuerpo que no es JSON", async () => {
  await expect(fetchOfficialRate(`${base}/html`)).rejects.toThrow("no es JSON");
});

test("fetchOfficialRate: tiempo de espera agotado", async () => {
  await expect(fetchOfficialRate(`${base}/slow`, 50)).rejects.toThrow("no respondió a tiempo");
});

test("fetchOfficialRate: sin conexión", async () => {
  const err = await fetchOfficialRate("http://127.0.0.1:1/v1/dolares").catch((e: unknown) => e);
  expect(err).toBeInstanceOf(RateApiError);
  expect((err as RateApiError).message).toContain("Sin conexión");
});
