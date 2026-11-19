import { expect, test } from "bun:test";
import { isLocalDate, localDayEndUtc, localDayStartUtc, presetDateRange, toLocalDate } from "./dates";

test("valida fechas de calendario", () => {
  expect(isLocalDate("2026-10-29")).toBe(true);
  expect(isLocalDate("2024-02-29")).toBe(true);
  expect(isLocalDate("2026-02-29")).toBe(false);
  expect(isLocalDate("2026-13-01")).toBe(false);
  expect(isLocalDate("29/10/2026")).toBe(false);
  expect(isLocalDate("2026-10-29T00:00")).toBe(false);
});

test("el día local va de las 04:00Z a las 04:00Z del día siguiente", () => {
  expect(localDayStartUtc("2026-10-29")).toBe("2026-10-29T04:00:00.000Z");
  expect(localDayEndUtc("2026-10-29")).toBe("2026-10-30T04:00:00.000Z");
  expect(localDayEndUtc("2026-12-31")).toBe("2027-01-01T04:00:00.000Z");
});

test("una venta a las 23:30 en Caracas pertenece a ese día aunque en UTC ya sea el siguiente", () => {
  expect(toLocalDate("2026-10-29T03:30:00.000Z")).toBe("2026-10-28");
  expect(toLocalDate("2026-10-29T04:00:00.000Z")).toBe("2026-10-29");
});

test("rechaza fechas inválidas", () => {
  expect(() => localDayStartUtc("2026-02-30")).toThrow(RangeError);
  expect(() => toLocalDate("no es fecha")).toThrow(RangeError);
});

test("atajos de rango en el día local: hoy, semana desde el lunes y mes desde el día 1", () => {
  const thursdayNight = "2026-10-30T03:30:00.000Z";
  expect(presetDateRange("today", thursdayNight)).toEqual({ from: "2026-10-29", to: "2026-10-29" });
  expect(presetDateRange("week", thursdayNight)).toEqual({ from: "2026-10-26", to: "2026-10-29" });
  expect(presetDateRange("month", thursdayNight)).toEqual({ from: "2026-10-01", to: "2026-10-29" });
});

test("la semana de un domingo empieza el lunes anterior, aunque cruce de mes", () => {
  expect(presetDateRange("week", "2026-11-01T15:00:00.000Z")).toEqual({ from: "2026-10-26", to: "2026-11-01" });
  expect(presetDateRange("week", "2026-10-26T15:00:00.000Z")).toEqual({ from: "2026-10-26", to: "2026-10-26" });
});
