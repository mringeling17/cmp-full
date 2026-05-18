import { format, lastDayOfMonth, subMonths } from 'date-fns';
import { MONTH_MAP } from '$lib/config/locale';

// MONTH_MAP is centralized in the locale config; re-exported for compatibility.
export { MONTH_MAP };

/** Get last day of a given month/year as YYYY-MM-DD */
export function getLastDayOfMonth(year: number, month: number): string {
	const date = new Date(year, month - 1, 1);
	return format(lastDayOfMonth(date), 'yyyy-MM-dd');
}

/** Get previous month info for email templates */
export function getPreviousMonthInfo(): { name: string; year: number; month: number } {
	const prev = subMonths(new Date(), 1);
	const name = format(prev, 'MMMM'); // English month name
	return {
		name: name.charAt(0).toUpperCase() + name.slice(1),
		year: prev.getFullYear(),
		month: prev.getMonth() + 1
	};
}

/** Format date for display */
export function formatDate(date: string | null | undefined): string {
	if (!date) return '-';
	try {
		return format(new Date(date), 'dd/MM/yyyy');
	} catch {
		return date;
	}
}

/** Format date as ISO (YYYY-MM-DD) */
export function toISODate(date: Date): string {
	return format(date, 'yyyy-MM-dd');
}

// `extractMonthFromFilename` lives in `$lib/services/excel` (it returns null
// when no month is found, never the current month). The duplicate that used
// to live here was dead code and has been removed.
