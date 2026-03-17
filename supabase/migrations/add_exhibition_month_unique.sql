-- Verificar duplicados primero (ejecutar como query antes)
-- SELECT invoice_number, exhibition_month, country, COUNT(*)
-- FROM invoices
-- GROUP BY invoice_number, exhibition_month, country
-- HAVING COUNT(*) > 1;

-- Drop old constraint if exists (invoice_number, country)
-- ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_invoice_number_country_key;

-- Crear unique constraint nuevo
ALTER TABLE invoices ADD CONSTRAINT invoices_number_month_country_unique
  UNIQUE (invoice_number, exhibition_month, country);
