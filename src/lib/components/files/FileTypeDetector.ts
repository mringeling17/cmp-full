export function detectFileType(filename: string): string {
	const lower = filename.toLowerCase();
	if (
		lower.includes('invoicesummary') ||
		lower.includes('invoice_summary') ||
		lower.includes('invoice summary')
	) {
		return 'invoice_summary';
	}
	if (
		lower.includes('credit') ||
		lower.includes('nota_credito') ||
		lower.includes('notacredito')
	) {
		return 'credit_notes';
	}
	if (lower.includes('factura') || lower.includes('billing')) {
		return 'facturacion';
	}
	if (lower.endsWith('.pdf')) {
		return 'certificaciones_pdf';
	}
	return 'other';
}

export const FILE_TYPE_LABELS: Record<string, string> = {
	invoice_summary: 'Invoice Summary',
	certificaciones_pdf: 'Certificacion PDF',
	credit_notes: 'Notas de Credito',
	facturacion: 'Facturacion',
	other: 'Otro'
};

export const FILE_TYPE_OPTIONS = Object.entries(FILE_TYPE_LABELS).map(([value, label]) => ({
	value,
	label
}));
