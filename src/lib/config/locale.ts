/**
 * Single source of truth for month names, currency↔country mapping and
 * country-specific billing display values. Pure module — safe to import
 * from both server and client code.
 */

/** Spanish + English month names → month number (for filename/header parsing) */
export const MONTH_MAP: Record<string, number> = {
	enero: 1,
	january: 1,
	jan: 1,
	febrero: 2,
	february: 2,
	feb: 2,
	marzo: 3,
	march: 3,
	mar: 3,
	abril: 4,
	april: 4,
	apr: 4,
	mayo: 5,
	may: 5,
	junio: 6,
	june: 6,
	jun: 6,
	julio: 7,
	july: 7,
	jul: 7,
	agosto: 8,
	august: 8,
	aug: 8,
	septiembre: 9,
	september: 9,
	sep: 9,
	octubre: 10,
	october: 10,
	oct: 10,
	noviembre: 11,
	november: 11,
	nov: 11,
	diciembre: 12,
	december: 12,
	dec: 12
};

/** 1-indexed Spanish month names (index 0 is empty for convenience). */
export const SPANISH_MONTHS = [
	'',
	'Enero',
	'Febrero',
	'Marzo',
	'Abril',
	'Mayo',
	'Junio',
	'Julio',
	'Agosto',
	'Septiembre',
	'Octubre',
	'Noviembre',
	'Diciembre'
] as const;

/** Returns the capitalized Spanish month name for a 1-12 month number. */
export function getSpanishMonthName(month: number): string {
	return SPANISH_MONTHS[month] ?? '';
}

/** Abbreviated Spanish month names, 0-indexed (Ene=0 … Dic=11) for charts. */
export const SHORT_SPANISH_MONTHS = [
	'Ene',
	'Feb',
	'Mar',
	'Abr',
	'May',
	'Jun',
	'Jul',
	'Ago',
	'Sep',
	'Oct',
	'Nov',
	'Dic'
] as const;

/** 1-indexed English month names (index 0 is empty for convenience). */
export const ENGLISH_MONTHS = [
	'',
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
] as const;

/**
 * Capitalized English month name for a 1-12 month number. Deterministic
 * replacement for `Date#toLocaleString('en', ...)`, which depends on the
 * runtime's ICU data.
 */
export function getEnglishMonthName(month: number): string {
	return ENGLISH_MONTHS[month] ?? '';
}

/** Currency code / country code → canonical country code. */
export const CURRENCY_TO_COUNTRY: Record<string, string> = {
	ars: 'ar',
	clp: 'cl',
	ar: 'ar',
	cl: 'cl'
};

/** Resolve a country code from a currency/country string. 'generico' if unknown. */
export function getCountryFromCurrency(currency: string): string {
	return CURRENCY_TO_COUNTRY[currency.trim().toLowerCase()] ?? 'generico';
}

/** Currency display name used in the billing/credit-note Excel MONEDA column. */
export const CURRENCY_DISPLAY_NAME: Record<string, string> = {
	ar: 'Pesos Argentinos',
	cl: 'Pesos Chilenos'
};

const BILLING_COUNTRIES = new Set(['ar', 'cl']);

/**
 * Country to use for billing math/labels. If the country could not be
 * determined ('generico' or unknown), fall back to 'ar' — this preserves the
 * historical behaviour (everything was billed as Argentina) instead of
 * silently producing a 0% tax export.
 */
export function resolveBillingCountry(country: string): string {
	return BILLING_COUNTRIES.has(country) ? country : 'ar';
}

/** Currency display name for a (possibly unknown) country. */
export function getCurrencyDisplayName(country: string): string {
	return CURRENCY_DISPLAY_NAME[resolveBillingCountry(country)];
}
