type Invoice = {
	invoice_date?: string | null;
	net_value?: number | null;
	gross_value?: number | null;
	client_id?: string | null;
	agency?: string | null;
	channel?: string | null;
	country?: string | null;
	spot_count?: number | null;
	[key: string]: unknown;
};

type ClientsMap = Map<string, string>; // id -> name

export interface GroupedItem {
	name: string;
	value: number;
}

export interface DeltaItem {
	name: string;
	valueA: number;
	valueB: number;
	delta: number;
	deltaPct: number | null;
}

export function filterInvoicesByPeriod(
	invoices: Invoice[],
	dateFrom: string | null,
	dateTo: string | null,
	clientIds?: string[],
	agencyIds?: string[],
	channels?: string[]
): Invoice[] {
	let list = invoices;

	if (dateFrom) {
		list = list.filter((inv) => inv.invoice_date && inv.invoice_date >= dateFrom);
	}
	if (dateTo) {
		list = list.filter((inv) => inv.invoice_date && inv.invoice_date <= dateTo);
	}
	if (clientIds && clientIds.length > 0) {
		list = list.filter((inv) => inv.client_id && clientIds.includes(inv.client_id));
	}
	if (agencyIds && agencyIds.length > 0) {
		list = list.filter((inv) => inv.agency && agencyIds.includes(inv.agency));
	}
	if (channels && channels.length > 0) {
		list = list.filter((inv) => inv.channel && channels.includes(inv.channel));
	}

	return list;
}

export function groupByClient(
	invoices: Invoice[],
	clientsMap: ClientsMap,
	valueField: 'net_value' | 'gross_value' = 'net_value'
): GroupedItem[] {
	const revenue = new Map<string, number>();

	for (const inv of invoices) {
		const name = (inv.client_id && clientsMap.get(inv.client_id)) || 'Sin cliente';
		revenue.set(name, (revenue.get(name) ?? 0) + ((inv[valueField] as number) ?? 0));
	}

	return Array.from(revenue.entries())
		.map(([name, value]) => ({ name, value }))
		.sort((a, b) => b.value - a.value);
}

export function groupByAgency(
	invoices: Invoice[],
	valueField: 'net_value' | 'gross_value' = 'net_value'
): GroupedItem[] {
	const revenue = new Map<string, number>();

	for (const inv of invoices) {
		const name = inv.agency || 'Directo';
		revenue.set(name, (revenue.get(name) ?? 0) + ((inv[valueField] as number) ?? 0));
	}

	return Array.from(revenue.entries())
		.map(([name, value]) => ({ name, value }))
		.sort((a, b) => b.value - a.value);
}

export function groupByChannel(
	invoices: Invoice[],
	valueField: 'net_value' | 'gross_value' = 'net_value'
): GroupedItem[] {
	const revenue = new Map<string, number>();

	for (const inv of invoices) {
		const name = inv.channel || 'Sin canal';
		revenue.set(name, (revenue.get(name) ?? 0) + ((inv[valueField] as number) ?? 0));
	}

	return Array.from(revenue.entries())
		.map(([name, value]) => ({ name, value }))
		.sort((a, b) => b.value - a.value);
}

export function computeDelta(periodA: GroupedItem[], periodB: GroupedItem[]): DeltaItem[] {
	const mapA = new Map(periodA.map((item) => [item.name, item.value]));
	const mapB = new Map(periodB.map((item) => [item.name, item.value]));

	const allNames = new Set([...mapA.keys(), ...mapB.keys()]);

	return Array.from(allNames)
		.map((name) => {
			const valueA = mapA.get(name) ?? 0;
			const valueB = mapB.get(name) ?? 0;
			const delta = valueB - valueA;
			const deltaPct = valueA !== 0 ? ((valueB - valueA) / valueA) * 100 : null;
			return { name, valueA, valueB, delta, deltaPct };
		})
		.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}
