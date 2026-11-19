import { check } from "../e2e-support/check";
import { type Phone, scan } from "./phone";

/** Resultado esperado de un escaneo: el estado (si importa) y el texto que ve el teléfono. */
export interface ExpectedScan {
  status?: string;
  message: string;
}

/** Escanea `code` y comprueba el resultado contra lo esperado. */
export async function expectScan(phone: Phone, code: string, expected: ExpectedScan, label: string): Promise<void> {
  const result = await scan(phone, code);
  const statusMatches = expected.status === undefined || result.status === expected.status;
  check(statusMatches && result.message === expected.message, label, result);
}
