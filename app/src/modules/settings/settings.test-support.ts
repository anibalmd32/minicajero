import type { Database } from "bun:sqlite";
import { beforeEach } from "bun:test";
import { createTestDatabase } from "../../test-support/test-database";

let current: Database;

export const validSettings = {
  business_name: "  Bodega La Esquina ",
  business_rif: "j-12345678-9",
  business_address: "Av. Principal, Caracas",
  business_phone: "0412-1234567",
  iva_percent: 16,
  display_currency: "VES" as const,
  low_stock_threshold: 8,
};

export function useSettingsDatabase(): void {
  beforeEach(() => {
    current = createTestDatabase();
  });
}

export function db(): Database {
  return current;
}
