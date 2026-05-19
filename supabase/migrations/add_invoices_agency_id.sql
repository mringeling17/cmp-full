-- #4 Atribución de agencia: FK estable agencia↔factura, capturada al importar
-- y nunca reescrita. El nombre se muestra por join (rename seguro). Se
-- conserva invoices.agency (texto) como respaldo histórico.
ALTER TABLE invoices
	ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES agencies(id);

CREATE INDEX IF NOT EXISTS idx_invoices_agency_id ON invoices (agency_id);
