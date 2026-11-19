import { parentPort, workerData } from "node:worker_threads";
import { openDatabase } from "../../db/connection";
import { createInvoice } from "./invoices.service";

/** Datos que recibe el worker de la prueba de concurrencia de numeración. */
export interface ConcurrencyWorkerInput {
  path: string;
  productId: number;
  sales: number;
}

const { path, productId, sales } = workerData as ConcurrencyWorkerInput;
const db = openDatabase(path);
const numbers: number[] = [];
try {
  for (let i = 0; i < sales; i++) {
    numbers.push(createInvoice({ payment_type: "cash", items: [{ product_id: productId, quantity: 1 }] }, db).number);
  }
  parentPort?.postMessage({ numbers });
} catch (err) {
  parentPort?.postMessage({ error: (err as Error).message });
} finally {
  db.close();
}
