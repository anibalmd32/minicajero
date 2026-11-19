import { NOW } from "./sql-now";

export const addInvoiceVoidReason = `
ALTER TABLE invoices ADD COLUMN void_reason TEXT CHECK (void_reason IS NULL OR length(trim(void_reason)) > 0);
`;

export const paymentsWithoutIdReuse = `
CREATE TABLE payments_new (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id       INTEGER NOT NULL REFERENCES invoices (id) ON DELETE RESTRICT,
  amount_usd_cents INTEGER NOT NULL CHECK (amount_usd_cents > 0),
  amount_bs_cents  INTEGER NOT NULL CHECK (amount_bs_cents > 0),
  currency         TEXT    NOT NULL CHECK (currency IN ('USD', 'VES')),
  rate             REAL    NOT NULL CHECK (rate > 0),
  notes            TEXT,
  created_at       TEXT    NOT NULL DEFAULT ${NOW}
) STRICT;
INSERT INTO payments_new (id, invoice_id, amount_usd_cents, amount_bs_cents, currency, rate, notes, created_at)
  SELECT id, invoice_id, amount_usd_cents, amount_bs_cents, currency, rate, notes, created_at FROM payments;
DROP TABLE payments;
ALTER TABLE payments_new RENAME TO payments;
CREATE INDEX idx_payments_invoice_created ON payments (invoice_id, created_at);
`;

export const authSchema = `
CREATE TABLE app_user (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  username      TEXT    NOT NULL UNIQUE COLLATE NOCASE CHECK (length(trim(username)) > 0),
  password_hash TEXT    NOT NULL,
  password_salt TEXT    NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT ${NOW},
  updated_at    TEXT    NOT NULL DEFAULT ${NOW}
) STRICT;

CREATE TABLE app_session (
  token_hash TEXT    PRIMARY KEY,
  created_at TEXT    NOT NULL DEFAULT ${NOW},
  expires_at TEXT    NOT NULL
) STRICT, WITHOUT ROWID;

CREATE INDEX idx_app_session_expires ON app_session (expires_at);
`;
