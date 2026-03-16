import * as XLSX from 'xlsx';

// Month mapping - sorted by length for matching
const MONTH_MAP: Record<string, number> = {
	septiembre: 9,
	september: 9,
	diciembre: 12,
	december: 12,
	noviembre: 11,
	november: 11,
	febrero: 2,
	february: 2,
	octubre: 10,
	october: 10,
	enero: 1,
	january: 1,
	agosto: 8,
	august: 8,
	marzo: 3,
	march: 3,
	abril: 4,
	april: 4,
	mayo: 5,
	junio: 6,
	june: 6,
	julio: 7,
	july: 7,
	jan: 1,
	feb: 2,
	mar: 3,
	apr: 4,
	may: 5,
	jun: 6,
	jul: 7,
	aug: 8,
	sep: 9,
	oct: 10,
	nov: 11,
	dec: 12
};

const CURRENCY_TO_COUNTRY: Record<string, string> = {
	ars: 'ar',
	mxn: 'mx',
	clp: 'cl',
	ar: 'ar',
	mx: 'mx',
	cl: 'cl'
};

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

export function extractYearFromFilename(filename: string): number {
	const parts = filename.split(/[_\-.\s]+/);
	for (const part of parts) {
		if (/^\d{4}$/.test(part)) {
			const y = parseInt(part);
			if (y >= 2020 && y <= 2100) return y;
		}
	}
	return new Date().getFullYear();
}

export function getCountryFromCurrency(currencyValue: string): string {
	return CURRENCY_TO_COUNTRY[currencyValue.trim().toLowerCase()] ?? 'generico';
}

export function normalizeInvoiceNumber(raw: unknown): string | null {
	if (raw === undefined || raw === null) return null;
	let str = String(raw).trim();
	if (str.endsWith('.0')) str = str.slice(0, -2);
	if (str === '' || str === 'NaN' || str === 'undefined') return null;
	return str;
}

export interface ParsedInvoiceRow {
	invoiceNumber: string;
	invoiceDate: string | null;
	grossValue: number | null;
	netValue: number | null;
	channel: string | null;
	agency: string;
	orderReference: string | null;
	client: string;
	currency: string | null;
	product: string | null;
	feed: string | null;
	campaignNumber: string | null;
	commissionPercent: number | null;
	commissionAmount: number | null;
	salesExecutive: string | null;
	systemSource: string | null;
	spotCount: number | null;
	businessType: string | null;
	documentType: string | null;
	companyCode: string | null;
	channelByFeed: string | null;
}

export function parseInvoiceSummary(
	buffer: ArrayBuffer,
	filename: string
): {
	rows: ParsedInvoiceRow[];
	country: string;
	month: number;
	year: number;
	errors: string[];
} {
	const workbook = XLSX.read(buffer, { type: 'array' });
	const sheet = workbook.Sheets['Invoice Summary'];
	if (!sheet) throw new Error('Sheet "Invoice Summary" not found');

	// Extract month/year from "Date From" cell (B4) which is an Excel serial date
	let headerMonth: number | null = null;
	let headerYear: number | null = null;
	const dateFromCell = sheet['B4'];
	if (dateFromCell && typeof dateFromCell.v === 'number') {
		const parsed = XLSX.SSF.parse_date_code(dateFromCell.v);
		if (parsed && parsed.y >= 2020 && parsed.y <= 2100) {
			headerMonth = parsed.m;
			headerYear = parsed.y;
		}
	}

	// Read with header at row 6 (skip 5 rows)
	const rawData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { range: 5 });

	const errors: string[] = [];
	const rows: ParsedInvoiceRow[] = [];

	const parseFloat_ = (val: unknown): number | null => {
		if (val === undefined || val === null || val === '' || isNaN(Number(val))) return null;
		return parseFloat(String(val));
	};

	const parseInt_ = (val: unknown): number | null => {
		if (val === undefined || val === null || val === '') return null;
		const str = String(val).trim();
		if (!/^\d+$/.test(str)) return null;
		return parseInt(str);
	};

	const str_ = (val: unknown): string | null => {
		if (val === undefined || val === null || String(val).trim() === '') return null;
		// NaN check: if val is a number and isNaN
		if (typeof val === 'number' && isNaN(val)) return null;
		return String(val).trim();
	};

	// Filter and validate
	for (let i = 0; i < rawData.length; i++) {
		const row = rawData[i];
		const rowNum = i + 7; // Actual Excel row (5 skipped + 1 header + 1-based index)

		// Skip TOTAL rows
		const invoiceDateStr = String(row['Invoice Date'] ?? '').trim();
		if (invoiceDateStr.toUpperCase() === 'TOTAL') continue;

		// Validate mandatory fields
		const invoiceRaw = row['Invoice #'];
		if (invoiceRaw === undefined || invoiceRaw === null || String(invoiceRaw).trim() === '')
			continue;

		const agencyRaw = row['Agency'];
		if (!agencyRaw || String(agencyRaw).trim() === '') {
			errors.push(`Fila ${rowNum}: 'Agency' es obligatorio y no puede estar vacio`);
			continue;
		}

		const clientRaw = row['Client'];
		if (!clientRaw || String(clientRaw).trim() === '') {
			errors.push(`Fila ${rowNum}: 'Client' es obligatorio y no puede estar vacio`);
			continue;
		}

		const invoiceNumber = normalizeInvoiceNumber(invoiceRaw);
		if (!invoiceNumber) continue;

		rows.push({
			invoiceNumber,
			invoiceDate: str_(row['Invoice Date']),
			grossValue: parseFloat_(row['Gross Invoice ']), // NOTE: trailing space!
			netValue: parseFloat_(row['Net Invoice']),
			channel: str_(row['Channel']),
			agency: String(agencyRaw).trim(),
			orderReference: str_(row['Order Reference']),
			client: String(clientRaw).trim(),
			currency: str_(row['Currency']),
			product: str_(row['Product']),
			feed: str_(row['Feed']),
			campaignNumber: str_(row['Campaign #']) !== null ? String(row['Campaign #']) : null,
			commissionPercent: parseFloat_(row['Comm %']),
			commissionAmount: parseFloat_(row['Commission']),
			salesExecutive: str_(row['Sales Exec.']),
			systemSource: str_(row['System']),
			spotCount: parseInt_(row['Spot Count']),
			businessType: str_(row['Business Type']),
			documentType: str_(row['Type']),
			companyCode: str_(row['Company Code']),
			channelByFeed: str_(row['Channel by Feed'])
		});
	}

	// Detect country from first row's currency
	const country =
		rows.length > 0 && rows[0].currency
			? getCountryFromCurrency(rows[0].currency)
			: 'generico';

	// Priority: Excel header dates > filename > current date
	const month = headerMonth ?? extractMonthFromFilename(filename);
	const year = headerYear ?? extractYearFromFilename(filename);

	return { rows, country, month, year, errors };
}

export function generateBillingExcel(
	rows: ParsedInvoiceRow[],
	month: number,
	year: number
): Uint8Array {
	// Date calculations
	const lastDayMonth = new Date(year, month, 0); // last day of month
	const nextMonth = month === 12 ? 1 : month + 1;
	const nextYear = month === 12 ? year + 1 : year;
	const lastDayNextMonth = new Date(nextYear, nextMonth, 0);

	const formatDateYMD = (d: Date) =>
		`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

	const fechaStr = formatDateYMD(lastDayMonth);
	const vencimientoStr = formatDateYMD(lastDayNextMonth);

	const monthDate = new Date(year, month - 1, 1);
	const monthName = monthDate.toLocaleString('en', { month: 'long' });
	const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

	const outputColumns = [
		'NUMERODECONTROL',
		'CLIENTE',
		'TIPO',
		'NUMERO',
		'FECHA',
		'VENCIMIENTODELCOBRO',
		'COMPROBANTEASOCIADO',
		'MONEDA',
		'COTIZACION',
		'OBSERVACIONES',
		'PRODUCTOSERVICIO',
		'CENTRODECOSTO',
		'PRODUCTOOBSERVACION',
		'CANTIDAD',
		'PRECIO',
		'DESCUENTO',
		'IMPORTE',
		'IVA'
	];

	const outputRows: Record<string, string | number>[] = [];

	rows.forEach((inv, idx) => {
		const controlNum = idx + 1;
		const precio = inv.grossValue ?? 0;
		const iva = Math.round(precio * 0.21 * 100) / 100;

		// Row 1: Header
		outputRows.push({
			NUMERODECONTROL: controlNum,
			CLIENTE: inv.agency,
			TIPO: 1,
			NUMERO: 'A-00002-00000000',
			FECHA: fechaStr,
			VENCIMIENTODELCOBRO: vencimientoStr,
			COMPROBANTEASOCIADO: '',
			MONEDA: 'Pesos Argentinos',
			COTIZACION: '',
			OBSERVACIONES: `Certificacion ${inv.invoiceNumber} / ${inv.channel ?? ''} / ${inv.client} / ${inv.orderReference ?? ''}`,
			PRODUCTOSERVICIO: '',
			CENTRODECOSTO: '',
			PRODUCTOOBSERVACION: '',
			CANTIDAD: '',
			PRECIO: '',
			DESCUENTO: '',
			IMPORTE: '',
			IVA: ''
		});

		// Row 2: Detail
		outputRows.push({
			NUMERODECONTROL: controlNum,
			CLIENTE: '',
			TIPO: '',
			NUMERO: '',
			FECHA: '',
			VENCIMIENTODELCOBRO: '',
			COMPROBANTEASOCIADO: '',
			MONEDA: '',
			COTIZACION: '',
			OBSERVACIONES: '',
			PRODUCTOSERVICIO: 'Servicio Publicidad',
			CENTRODECOSTO: 'NBCU ON AIR',
			PRODUCTOOBSERVACION: `${capitalizedMonth}, ${year}`,
			CANTIDAD: 1,
			PRECIO: precio,
			DESCUENTO: '',
			IMPORTE: precio,
			IVA: iva
		});
	});

	const ws = XLSX.utils.json_to_sheet(outputRows, { header: outputColumns });
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Facturacion');
	return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
}

// ─── Credit Notes Generation ───

export interface XubioRow {
	observaciones: string;
	cliente: string;
	comprobante: string;
}

export function parseXubioFile(buffer: ArrayBuffer): XubioRow[] {
	const workbook = XLSX.read(buffer, { type: 'array' });
	const sheetName = workbook.SheetNames[0];
	if (!sheetName) throw new Error('El archivo Xubio no tiene hojas');

	const sheet = workbook.Sheets[sheetName];
	const rawData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet);

	const rows: XubioRow[] = [];
	for (const row of rawData) {
		const observaciones = String(row['Observaciones'] ?? '').trim();
		const cliente = String(row['Cliente'] ?? '').trim();
		const comprobante = String(row['Comprobante'] ?? '').trim();

		if (!observaciones || !comprobante) continue;

		rows.push({ observaciones, cliente, comprobante });
	}

	return rows;
}

export function buildObservacion(row: ParsedInvoiceRow): string {
	return `Certificacion ${row.invoiceNumber} / ${row.channel ?? ''} / ${row.client} / ${row.orderReference ?? ''}`;
}

export interface CreditNoteMatch {
	clienteXubio: string;
	comprobante: string;
	observacion: string;
	commission: number;
}

export function crossInvoiceSummaryWithXubio(
	invoiceRows: ParsedInvoiceRow[],
	xubioRows: XubioRow[]
): { matches: CreditNoteMatch[]; unmatched: string[] } {
	// Build a map from observaciones → xubio row for fast lookup
	const xubioMap = new Map<string, XubioRow>();
	for (const xr of xubioRows) {
		xubioMap.set(xr.observaciones, xr);
	}

	const matches: CreditNoteMatch[] = [];
	const unmatched: string[] = [];

	for (const inv of invoiceRows) {
		const obs = buildObservacion(inv);
		const xubio = xubioMap.get(obs);

		if (xubio) {
			matches.push({
				clienteXubio: xubio.cliente,
				comprobante: xubio.comprobante,
				observacion: obs,
				commission: inv.commissionAmount ?? 0
			});
		} else {
			unmatched.push(obs);
		}
	}

	return { matches, unmatched };
}

const SPANISH_MONTHS = [
	'', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
	'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function generateCreditNotesExcel(
	matches: CreditNoteMatch[],
	month: number,
	year: number
): Uint8Array {
	// Date calculations
	const lastDayMonth = new Date(year, month, 0);
	const nextMonth = month === 12 ? 1 : month + 1;
	const nextYear = month === 12 ? year + 1 : year;
	const lastDayNextMonth = new Date(nextYear, nextMonth, 0);

	const formatDateDMY = (d: Date) =>
		`${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

	const fechaStr = formatDateDMY(lastDayMonth);
	const vencimientoStr = formatDateDMY(lastDayNextMonth);
	const monthName = SPANISH_MONTHS[month] ?? '';

	const outputColumns = [
		'NUMERODECONTROL', 'CLIENTE', 'TIPO', 'NUMERO', 'FECHA',
		'VENCIMIENTODELCOBRO', 'COMPROBANTEASOCIADO', 'MONEDA', 'COTIZACION',
		'OBSERVACIONES', 'PRODUCTOSERVICIO', 'CENTRODECOSTO', 'PRODUCTOOBSERVACION',
		'CANTIDAD', 'PRECIO', 'DESCUENTO', 'IMPORTE', 'IVA'
	];

	const outputRows: Record<string, string | number>[] = [];

	matches.forEach((m, idx) => {
		const controlNum = idx + 1;
		const commission = m.commission;
		const iva = Math.round(commission * 0.21 * 100) / 100;

		// Row 1: Header
		outputRows.push({
			NUMERODECONTROL: controlNum,
			CLIENTE: m.clienteXubio,
			TIPO: 3,
			NUMERO: 'A-00002-00000000',
			FECHA: fechaStr,
			VENCIMIENTODELCOBRO: vencimientoStr,
			COMPROBANTEASOCIADO: m.comprobante,
			MONEDA: 'Pesos Argentinos',
			COTIZACION: 1,
			OBSERVACIONES: m.observacion,
			PRODUCTOSERVICIO: '',
			CENTRODECOSTO: '',
			PRODUCTOOBSERVACION: '',
			CANTIDAD: '',
			PRECIO: '',
			DESCUENTO: '',
			IMPORTE: '',
			IVA: ''
		});

		// Row 2: Detail
		outputRows.push({
			NUMERODECONTROL: controlNum,
			CLIENTE: '',
			TIPO: '',
			NUMERO: '',
			FECHA: '',
			VENCIMIENTODELCOBRO: '',
			COMPROBANTEASOCIADO: '',
			MONEDA: '',
			COTIZACION: '',
			OBSERVACIONES: '',
			PRODUCTOSERVICIO: 'Servicio Publicidad',
			CENTRODECOSTO: 'NBCU ON AIR',
			PRODUCTOOBSERVACION: `${monthName}, ${year}`,
			CANTIDAD: 1,
			PRECIO: commission,
			DESCUENTO: 0,
			IMPORTE: commission,
			IVA: iva
		});
	});

	const ws = XLSX.utils.json_to_sheet(outputRows, { header: outputColumns });
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'NotasCredito');
	return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
}
