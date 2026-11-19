import { NOW } from "./sql-now";

export const coreTablesSql = `
CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT ${NOW}
) STRICT, WITHOUT ROWID;

INSERT INTO settings (key, value) VALUES
  ('business_name', ''),
  ('business_rif', ''),
  ('business_address', ''),
  ('business_phone', ''),
  ('tax_percent', '0'),
  ('display_currency', 'USD'),
  ('rate_mode', 'auto');

CREATE TABLE exchange_rates (
  id              INTEGER PRIMARY KEY,
  rate            REAL    NOT NULL CHECK (rate > 0),
  source          TEXT    NOT NULL CHECK (source IN ('api', 'manual')),
  api_date        TEXT,
  created_at      TEXT    NOT NULL DEFAULT ${NOW},
  last_checked_at TEXT    NOT NULL DEFAULT ${NOW},
  CHECK (source = 'api' OR api_date IS NULL)
) STRICT;

CREATE INDEX idx_exchange_rates_source_created ON exchange_rates (source, created_at DESC);
CREATE INDEX idx_exchange_rates_created ON exchange_rates (created_at DESC);

CREATE TABLE customers (
  id         INTEGER PRIMARY KEY,
  first_name TEXT NOT NULL CHECK (length(trim(first_name)) > 0),
  last_name  TEXT NOT NULL CHECK (length(trim(last_name)) > 0),
  doc_type   TEXT NOT NULL CHECK (doc_type IN ('V', 'E', 'J')),
  doc_number TEXT NOT NULL CHECK (length(trim(doc_number)) > 0),
  phone      TEXT,
  created_at TEXT NOT NULL DEFAULT ${NOW},
  updated_at TEXT NOT NULL DEFAULT ${NOW},
  UNIQUE (doc_type, doc_number)
) STRICT;

CREATE INDEX idx_customers_name ON customers (first_name COLLATE NOCASE, last_name COLLATE NOCASE);
CREATE INDEX idx_customers_last_name ON customers (last_name COLLATE NOCASE);
CREATE INDEX idx_customers_doc_number ON customers (doc_number);

CREATE TABLE products (
  id              INTEGER PRIMARY KEY,
  code            TEXT UNIQUE COLLATE NOCASE CHECK (code IS NULL OR length(trim(code)) > 0),
  name            TEXT    NOT NULL CHECK (length(trim(name)) > 0),
  price_usd_cents INTEGER NOT NULL CHECK (price_usd_cents >= 0),
  stock           INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  active          INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at      TEXT    NOT NULL DEFAULT ${NOW},
  updated_at      TEXT    NOT NULL DEFAULT ${NOW}
) STRICT;

CREATE INDEX idx_products_name ON products (name COLLATE NOCASE);
CREATE INDEX idx_products_active_name ON products (active, name COLLATE NOCASE);
`;
