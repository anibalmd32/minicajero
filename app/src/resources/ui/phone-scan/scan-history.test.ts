import { expect, test } from "bun:test";
import { LOST_SCAN_TEXT, markPendingScansLost, pushScan, resolveScan, type ScanEntry, scanTone } from "./scan-history";

function entry(id: string, tone: ScanEntry["tone"] = "pending"): ScanEntry {
  return { id, code: `C${id}`, tone, message: "Enviando…", at: 0 };
}

test("scanTone da éxito, aviso o error según la respuesta", () => {
  expect(["added", "filled", "created", "found"].map((status) => scanTone(status as never))).toEqual([
    "success",
    "success",
    "success",
    "success",
  ]);
  expect(["not-found", "no-stock", "no-target"].map((status) => scanTone(status as never))).toEqual([
    "warning",
    "warning",
    "warning",
  ]);
  expect(scanTone("error")).toBe("danger");
});

test("los escaneos nuevos van primero y se limita el tamaño", () => {
  let entries: ScanEntry[] = [];
  for (let i = 1; i <= 5; i++) entries = pushScan(entries, entry(String(i)), 3);
  expect(entries.map((item) => item.id)).toEqual(["5", "4", "3"]);
});

test("resolveScan actualiza el resultado y no toca los demás", () => {
  const entries = [entry("2"), entry("1")];
  const resolved = resolveScan(entries, "1", "success", "Agregado");
  expect(resolved?.[1]).toMatchObject({ id: "1", tone: "success", message: "Agregado" });
  expect(resolved?.[0]).toBe(entries[0] as ScanEntry);
  expect(resolveScan(entries, "9", "success", "x")).toBeNull();
});

test("al perder la conexión los pendientes quedan con un aviso, sin darlos por perdidos", () => {
  const entries = markPendingScansLost([entry("2"), entry("1", "success")]);
  expect(entries[0]).toMatchObject({ tone: "warning", message: LOST_SCAN_TEXT });
  expect(LOST_SCAN_TEXT).not.toContain("de nuevo");
  expect(entries[1]?.tone).toBe("success");
});
