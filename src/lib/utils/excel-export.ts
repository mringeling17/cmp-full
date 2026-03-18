import * as XLSX from 'xlsx';

interface DashboardExportData {
	kpis: { label: string; value: string }[];
	topClients: { name: string; value: number }[];
	channelDistribution: { name: string; value: number; percent: number }[];
	agencyDistribution: { name: string; value: number }[];
	monthlyTrend: { month: string; value: number }[];
	quarterly: { quarter: string; value: number }[];
}

interface ComparisonExportData {
	totalA: number;
	totalB: number;
	diff: number;
	diffPct: number | null;
	dimensionLabel: string;
	rows: {
		name: string;
		valueA: number;
		valueB: number;
		delta: number;
		deltaPct: number | null;
	}[];
}

interface ReportExportData {
	title: string;
	rows: Record<string, string | number>[];
	columns: { header: string; field: string }[];
}

export function exportDashboardToExcel(data: DashboardExportData, country: string, filename: string): void {
	const wb = XLSX.utils.book_new();

	// Sheet 1: KPIs
	const kpiData = data.kpis.map((k) => ({ Indicador: k.label, Valor: k.value }));
	const kpiSheet = XLSX.utils.json_to_sheet(kpiData);
	kpiSheet['!cols'] = [{ wch: 20 }, { wch: 25 }];
	XLSX.utils.book_append_sheet(wb, kpiSheet, 'KPIs');

	// Sheet 2: Top Clientes
	const clientSheet = XLSX.utils.json_to_sheet(
		data.topClients.map((c) => ({ Cliente: c.name, Monto: c.value }))
	);
	clientSheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
	XLSX.utils.book_append_sheet(wb, clientSheet, 'Top Clientes');

	// Sheet 3: Por Canal
	const channelSheet = XLSX.utils.json_to_sheet(
		data.channelDistribution.map((c) => ({
			Canal: c.name,
			Monto: c.value,
			'%': c.percent
		}))
	);
	channelSheet['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 10 }];
	XLSX.utils.book_append_sheet(wb, channelSheet, 'Por Canal');

	// Sheet 4: Por Agencia
	const agencySheet = XLSX.utils.json_to_sheet(
		data.agencyDistribution.map((a) => ({ Agencia: a.name, Monto: a.value }))
	);
	agencySheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
	XLSX.utils.book_append_sheet(wb, agencySheet, 'Por Agencia');

	// Sheet 5: Tendencia Mensual
	const monthSheet = XLSX.utils.json_to_sheet(
		data.monthlyTrend.map((m) => ({ Mes: m.month, Monto: m.value }))
	);
	monthSheet['!cols'] = [{ wch: 15 }, { wch: 20 }];
	XLSX.utils.book_append_sheet(wb, monthSheet, 'Tendencia Mensual');

	// Sheet 6: Trimestral
	const qSheet = XLSX.utils.json_to_sheet(
		data.quarterly.map((q) => ({ Trimestre: q.quarter, Monto: q.value }))
	);
	qSheet['!cols'] = [{ wch: 15 }, { wch: 20 }];
	XLSX.utils.book_append_sheet(wb, qSheet, 'Trimestral');

	XLSX.writeFile(wb, filename);
}

export function exportComparisonToExcel(data: ComparisonExportData, country: string, filename: string): void {
	const wb = XLSX.utils.book_new();

	// Sheet 1: Resumen
	const resumenData = [
		{ Indicador: 'Total Periodo A', Valor: data.totalA },
		{ Indicador: 'Total Periodo B', Valor: data.totalB },
		{ Indicador: 'Diferencia', Valor: data.diff },
		{ Indicador: 'Variacion %', Valor: data.diffPct != null ? `${data.diffPct.toFixed(1)}%` : 'N/A' }
	];
	const resumenSheet = XLSX.utils.json_to_sheet(resumenData);
	resumenSheet['!cols'] = [{ wch: 20 }, { wch: 25 }];
	XLSX.utils.book_append_sheet(wb, resumenSheet, 'Resumen');

	// Sheet 2: Detalle
	const detalleRows = data.rows.map((r) => ({
		[data.dimensionLabel]: r.name,
		'Periodo A': r.valueA,
		'Periodo B': r.valueB,
		Diferencia: r.delta,
		'%': r.deltaPct != null ? `${r.deltaPct.toFixed(1)}%` : 'N/A'
	}));
	// Add total row
	detalleRows.push({
		[data.dimensionLabel]: 'Total general',
		'Periodo A': data.totalA,
		'Periodo B': data.totalB,
		Diferencia: data.diff,
		'%': data.diffPct != null ? `${data.diffPct.toFixed(1)}%` : 'N/A'
	});
	const detalleSheet = XLSX.utils.json_to_sheet(detalleRows);
	detalleSheet['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 10 }];
	XLSX.utils.book_append_sheet(wb, detalleSheet, `Por ${data.dimensionLabel}`);

	XLSX.writeFile(wb, filename);
}

export function exportReportToExcel(data: ReportExportData, filename: string): void {
	const wb = XLSX.utils.book_new();

	const sheetData = data.rows.map((row) => {
		const out: Record<string, string | number> = {};
		for (const col of data.columns) {
			out[col.header] = row[col.field] ?? '';
		}
		return out;
	});

	const sheet = XLSX.utils.json_to_sheet(sheetData);
	sheet['!cols'] = data.columns.map((col, i) => ({ wch: i === 0 ? 35 : 18 }));
	XLSX.utils.book_append_sheet(wb, sheet, 'Reporte');

	XLSX.writeFile(wb, filename);
}
