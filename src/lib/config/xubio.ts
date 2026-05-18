/**
 * Fixed values written into the Xubio billing / credit-note Excel exports.
 * These are business constants — change here if the Xubio account changes.
 */
export const XUBIO = {
	/** Product/service description column. */
	PRODUCTO_SERVICIO: 'Servicio Publicidad',
	/** Cost center column. */
	CENTRO_COSTO: 'NBCU ON AIR',
	/** TIPO for regular billing rows (invoice). */
	TIPO_FACTURA: 1,
	/** TIPO for credit-note rows. */
	TIPO_NOTA_CREDITO: 3,
	/** Fixed exchange rate column. */
	COTIZACION: 1,
	/** Fixed quantity per detail line. */
	CANTIDAD: 1,
	/** Output sheet names. */
	SHEET_BILLING: 'Facturacion',
	SHEET_CREDIT_NOTES: 'NotasCredito'
} as const;
