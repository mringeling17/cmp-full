type Invoice = {
	invoice_date?: string | null;
	net_value?: number | null;
	gross_value?: number | null;
	spot_count?: number | null;
	client_id?: string | null;
	agency?: string | null;
	channel?: string | null;
	country?: string | null;
	[key: string]: unknown;
};

type ClientsMap = Map<string, string>;

export interface ReportConfig {
	rows: 'client' | 'agency' | 'channel';
	columns: 'none' | 'months' | 'quarters';
	metric: 'net_value' | 'gross_value' | 'spot_count';
	filters: {
		year: number;
		monthFrom?: number;
		monthTo?: number;
		clientIds?: string[];
		agencyIds?: string[];
		channels?: string[];
	};
}

export interface ReportRow {
	name: string;
	total: number;
	periods: Record<string, number>;
}

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export function getColumnHeaders(config: ReportConfig): string[] {
	if (config.columns === 'none') return [];

	const from = config.filters.monthFrom ?? 1;
	const to = config.filters.monthTo ?? 12;

	if (config.columns === 'months') {
		const headers: string[] = [];
		for (let m = from; m <= to; m++) {
			headers.push(MONTH_NAMES[m - 1]);
		}
		return headers;
	}

	if (config.columns === 'quarters') {
		const quarters = new Set<string>();
		for (let m = from; m <= to; m++) {
			const q = Math.ceil(m / 3);
			quarters.add(`Q${q}`);
		}
		return Array.from(quarters).sort();
	}

	return [];
}

export function generateReportData(
	invoices: Invoice[],
	config: ReportConfig,
	clientsMap: ClientsMap,
	agencyIdsToNames?: Map<string, string>
): ReportRow[] {
	// 1. Filter
	let filtered = invoices.filter((inv) => {
		if (!inv.invoice_date) return false;
		const date = new Date(inv.invoice_date);
		if (date.getFullYear() !== config.filters.year) return false;

		const month = date.getMonth() + 1;
		if (config.filters.monthFrom && month < config.filters.monthFrom) return false;
		if (config.filters.monthTo && month > config.filters.monthTo) return false;

		return true;
	});

	if (config.filters.clientIds && config.filters.clientIds.length > 0) {
		filtered = filtered.filter((inv) => inv.client_id && config.filters.clientIds!.includes(inv.client_id));
	}
	if (config.filters.agencyIds && config.filters.agencyIds.length > 0) {
		const agencyNames = agencyIdsToNames
			? config.filters.agencyIds.map((id) => agencyIdsToNames.get(id)).filter(Boolean)
			: config.filters.agencyIds;
		filtered = filtered.filter((inv) => inv.agency && agencyNames.includes(inv.agency!));
	}
	if (config.filters.channels && config.filters.channels.length > 0) {
		filtered = filtered.filter((inv) => inv.channel && config.filters.channels!.includes(inv.channel));
	}

	// 2. Group by dimension
	const groups = new Map<string, Invoice[]>();
	for (const inv of filtered) {
		let key: string;
		if (config.rows === 'client') {
			key = (inv.client_id && clientsMap.get(inv.client_id)) || 'Sin cliente';
		} else if (config.rows === 'agency') {
			key = inv.agency || 'Directo';
		} else {
			key = inv.channel || 'Sin canal';
		}
		if (!groups.has(key)) groups.set(key, []);
		groups.get(key)!.push(inv);
	}

	// 3. Compute values
	const metricField = config.metric;
	const columnHeaders = getColumnHeaders(config);

	const rows: ReportRow[] = [];
	for (const [name, invs] of groups) {
		const periods: Record<string, number> = {};

		if (config.columns !== 'none') {
			// Initialize all periods to 0
			for (const header of columnHeaders) {
				periods[header] = 0;
			}

			for (const inv of invs) {
				if (!inv.invoice_date) continue;
				const date = new Date(inv.invoice_date);
				const month = date.getMonth() + 1;
				let periodKey: string;

				if (config.columns === 'months') {
					periodKey = MONTH_NAMES[month - 1];
				} else {
					const q = Math.ceil(month / 3);
					periodKey = `Q${q}`;
				}

				if (periods[periodKey] !== undefined) {
					periods[periodKey] += (inv[metricField] as number) ?? 0;
				}
			}
		}

		const total = invs.reduce((sum, inv) => sum + ((inv[metricField] as number) ?? 0), 0);
		rows.push({ name, total, periods });
	}

	// 4. Sort by total descending
	rows.sort((a, b) => b.total - a.total);

	return rows;
}

export function computeReportTotals(rows: ReportRow[], columnHeaders: string[]): ReportRow {
	const periods: Record<string, number> = {};
	for (const header of columnHeaders) {
		periods[header] = rows.reduce((sum, r) => sum + (r.periods[header] ?? 0), 0);
	}
	const total = rows.reduce((sum, r) => sum + r.total, 0);
	return { name: 'Total general', total, periods };
}
