/** Format percentage */
export function formatPercentage(value: number | null | undefined): string {
	if (value == null) return '-';
	return `${(value * 100).toFixed(1)}%`;
}

/** Format a raw percentage value (already in %, not decimal) */
export function formatPercentageRaw(value: number | null | undefined): string {
	if (value == null) return '-';
	return `${value.toFixed(1)}%`;
}

/** Truncate text with ellipsis */
export function truncate(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	return text.slice(0, maxLength) + '...';
}

/** Currency to country code mapping (for Excel processing) */
export const CURRENCY_TO_COUNTRY: Record<string, string> = {
	ars: 'ar',
	mxn: 'mx',
	clp: 'cl',
	ar: 'ar',
	mx: 'mx',
	cl: 'cl'
};

export function getCountryFromCurrency(currency: string): string {
	return CURRENCY_TO_COUNTRY[currency.trim().toLowerCase()] ?? 'generico';
}
