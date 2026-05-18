import { MIN_YEAR, MAX_YEAR } from '$lib/config/constants';

/**
 * Last-resort billing period: ALWAYS the previous month, never the current
 * one, to avoid silently labelling prior-period sales with the in-progress
 * month.
 */
export function previousMonthPeriod(): { month: number; year: number } {
	const now = new Date();
	const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	return { month: prev.getMonth() + 1, year: prev.getFullYear() };
}

/** Default period string ("YYYY-MM") for <input type="month"> — previous month. */
export function defaultPeriodString(): string {
	const { month, year } = previousMonthPeriod();
	return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Parse an optional month/year value coming from a request (JSON body or
 * FormData). Returns `{ value: null }` when absent, and `{ valid: false }`
 * when present but not a valid integer.
 */
export function parsePeriodPart(v: unknown): { value: number | null; valid: boolean } {
	if (v === undefined || v === null || v === '') return { value: null, valid: true };
	const n = Number(v);
	if (!Number.isFinite(n) || !Number.isInteger(n)) return { value: null, valid: false };
	return { value: n, valid: true };
}

/** Validate a resolved month/year override pair. Returns an error string or null. */
export function validatePeriodOverride(
	month: number | null,
	year: number | null
): string | null {
	if (month !== null && (month < 1 || month > 12)) return 'Mes inválido';
	if (year !== null && (year < MIN_YEAR || year > MAX_YEAR)) return 'Año inválido';
	return null;
}
