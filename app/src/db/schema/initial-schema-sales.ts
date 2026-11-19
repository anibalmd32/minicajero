import { NOW } from "./sql-now";

export const salesTablesSql = `
CREATE TABLE invoices (
  id                 INTEGER PRIMARY KEY,
  number             INTEGER NOT NULL UNIQUE CHECK (number > 0),
  customer_id        INTEGER REFERENCES customers (id) ON DELETE RESTRICT,
  status             TEXT    NOT NULL CHECK (status IN ('paid', 'pending', 'void')),
  payment_type       TEXT    NOT NULL CHECK (payment_type IN ('cash', 'credit')),
  rate               REAL    NOT NULL CHECK (rate > 0),
  tax_percent        REAL    NOT NULL DEFAULT 0 CHECK (tax_percent >= 0 AND tax_percent <= 100),
  subtotal_usd_cents INTEGER NOT NULL CHECK (subtotal_usd_cents >= 0),
  tax_usd_cents      INTEGER NOT NULL CHECK (tax_usd_cents >= 0),
  total_usd_cents    INTEGER NOT NULL CHECK (total_usd_cents >= 0),
  subtotal_bs_cents  INTEGER NOT NULL CHECK (subtotal_bs_cents >= 0),
  tax_bs_cents       INTEGER NOT NULL CHECK (tax_bs_cents >= 0),
  total_bs_cents     INTEGER NOT NULL CHECK (total_bs_cents >= 0),
  notes              TEXT,
  created_at         TEXT    NOT NULL DEFAULT ${NOW},
  voided_at          TEXT,
  CHECK (payment_type = 'cash' OR customer_id IS NOT NULL),
  CHECK (payment_type = 'credit' OR status IN ('paid', 'void')),
  CHECK ((status = 'void') = (voided_at IS NOT NULL)),
  CHECK (total_usd_cents = subtotal_usd_cents + tax_usd_cents),
  CHECK (total_bs_cents = subtotal_bs_cents + tax_bs_cents)
) STRICT;

CREATE INDEX idx_invoices_customer_created ON invoices (customer_id, created_at DESC);
CREATE INDEX idx_invoices_status_created ON invoices (status, created_at DESC);
CREATE INDEX idx_invoices_created ON invoices (created_at DESC);

CREATE TABLE invoice_items (
  id                   INTEGER PRIMARY KEY,
  invoice_id           INTEGER NOT NULL REFERENCES invoices (id) ON DELETE CASCADE,
  product_id           INTEGER NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
  product_name         TEXT    NOT NULL,
  quantity             INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_usd_cents INTEGER NOT NULL CHECK (unit_price_usd_cents >= 0),
  unit_price_bs_cents  INTEGER NOT NULL CHECK (unit_price_bs_cents >= 0),
  line_total_usd_cents INTEGER NOT NULL CHECK (line_total_usd_cents >= 0),
  line_total_bs_cents  INTEGER NOT NULL CHECK (line_total_bs_cents >= 0)
) STRICT;

CREATE INDEX idx_invoice_items_invoice ON invoice_items (invoice_id);
CREATE INDEX idx_invoice_items_product ON invoice_items (product_id);

CREATE TABLE payments (
  id               INTEGER PRIMARY KEY,
  invoice_id       INTEGER NOT NULL REFERENCES invoices (id) ON DELETE RESTRICT,
  amount_usd_cents INTEGER NOT NULL CHECK (amount_usd_cents > 0),
  amount_bs_cents  INTEGER NOT NULL CHECK (amount_bs_cents > 0),
  currency         TEXT    NOT NULL CHECK (currency IN ('USD', 'VES')),
  rate             REAL    NOT NULL CHECK (rate > 0),
  notes            TEXT,
  created_at       TEXT    NOT NULL DEFAULT ${NOW}
) STRICT;

CREATE INDEX idx_payments_invoice_created ON payments (invoice_id, created_at);
`;
