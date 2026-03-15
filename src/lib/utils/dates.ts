import { format, lastDayOfMonth, subMonths } from 'date-fns';

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

/** Month mapping for Excel filename parsing (Spanish + English) */
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

/** Extract month number from a filename containing month name */
export function extractMonthFromFilename(filename: string): number {
	const parts = filename.toLowerCase().split(/[_\-.\s]+/);
	const sortedMonths = Object.entries(MONTH_MAP).sort((a, b) => b[0].length - a[0].length);
	for (const part of parts) {
		for (const [name, num] of sortedMonths) {
			if (part === name) return num;
		}
	}
	return new Date().getMonth() + 1;
}
