-- Soft-delete / hide support for invoices.
-- When an Invoice Summary is re-processed for a (exhibition_month, country),
-- invoices that are no longer present in the new file are marked hidden=true
-- instead of being deleted, so the data is recoverable and auditable.

ALTER TABLE invoices
	ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

-- Speeds up the "replace whole month" sweep and the hidden=false read filter.
CREATE INDEX IF NOT EXISTS idx_invoices_period_country_hidden
	ON invoices (exhibition_month, country, hidden);
