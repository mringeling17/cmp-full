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

// Currency↔country mapping lives in the central locale config; re-exported
// here for backwards compatibility with existing imports.
export { CURRENCY_TO_COUNTRY, getCountryFromCurrency } from '$lib/config/locale';
