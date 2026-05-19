-- #7 Registro de pago: mes de cobranza (YYYY-MM) además de payment_date.
ALTER TABLE payments
	ADD COLUMN IF NOT EXISTS collection_month text;
