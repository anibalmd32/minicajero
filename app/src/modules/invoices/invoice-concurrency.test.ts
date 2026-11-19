import type { Database } from "bun:sqlite";
import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Worker } from "node:worker_threads";
import { openDatabase } from "../../db/connection";
import { migrations } from "../../db/migrations";
import { runMigrations } from "../../db/migrator";
import { getProduct, getStockMovements } from "../products/products.service";
import type { ConcurrencyWorkerInput } from "./invoices.concurrency-worker";
import { createInvoice } from "./invoices.service";
import { cashSale, product, setRate } from "./invoices.test-support";

interface WorkerResult {
  numbers?: number[];
  error?: string;
}

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "lb-invoices-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function fileDatabase(): { path: string; first: Database } {
  const path = join(dir, "billing.sqlite");
  const first = openDatabase(path);
  runMigrations(first, migrations);
  return { path, first };
}

function runSellingWorker(input: ConcurrencyWorkerInput): Promise<WorkerResult> {
  const worker = new Worker(new URL("./invoices.concurrency-worker.ts", import.meta.url), { workerData: input });
  return new Promise<WorkerResult>((resolve, reject) => {
    worker.once("message", resolve);
    worker.once("error", reject);
  }).finally(() => worker.terminate());
}

test("la venta toma el bloqueo de escritura antes de leer el número: otra conexión espera su turno", () => {
  const { path, first } = fileDatabase();
  setRate(first, 40);
  const pan = product(first, { name: "Pan", price_usd: 1, stock: 10 });
  const second = openDatabase(path);
  second.run("PRAGMA busy_timeout = 0");
  try {
    first.run("BEGIN IMMEDIATE");
    first.run(
      `INSERT INTO invoices (number, status, payment_type, rate, subtotal_usd_cents, tax_usd_cents, total_usd_cents,
         subtotal_bs_cents, tax_bs_cents, total_bs_cents)
       VALUES (1, 'paid', 'cash', 40, 100, 0, 100, 4000, 0, 4000)`,
    );
    expect(() => createInvoice(cashSale(pan), second)).toThrow(/locked|busy/i);
    first.run("COMMIT");
    expect(createInvoice(cashSale(pan), second).number).toBe(2);
  } finally {
    second.close();
    first.close();
  }
});

test("varios procesos vendiendo a la vez obtienen números únicos y consecutivos y el stock cuadra", async () => {
  const { path, first } = fileDatabase();
  setRate(first, 40);
  const pan = product(first, { name: "Pan", price_usd: 1, stock: 100 });
  first.close();
  const workers = 4;
  const salesPerWorker = 15;
  const input: ConcurrencyWorkerInput = { path, productId: pan, sales: salesPerWorker };
  const results = await Promise.all(Array.from({ length: workers }, () => runSellingWorker(input)));
  expect(results.map((result) => result.error ?? null)).toEqual(Array(workers).fill(null));
  const numbers = results.flatMap((result) => result.numbers ?? []).sort((a, b) => a - b);
  const total = workers * salesPerWorker;
  expect(numbers).toEqual(Array.from({ length: total }, (_, index) => index + 1));
  const check = openDatabase(path);
  try {
    expect(getProduct(pan, check).stock).toBe(100 - total);
    expect(getStockMovements(pan, { limit: 200, offset: 0 }, check).total).toBe(total + 1);
  } finally {
    check.close();
  }
}, 30_000);
