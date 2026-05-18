/** Canonical file_type values stored in the `files` table. */
export const FILE_TYPE = {
	INVOICE_SUMMARY: 'invoice_summary',
	CREDIT_NOTES: 'credit_notes',
	FACTURACION: 'facturacion',
	CERTIFICACIONES_PDF: 'certificaciones_pdf',
	OTHER: 'other'
} as const;

export type FileType = (typeof FILE_TYPE)[keyof typeof FILE_TYPE];

/** `files.status` values. */
export const FILE_STATUS = {
	ACTIVE: 'active'
} as const;

/** `files_log.status` values. */
export const LOG_STATUS = {
	SUCCESS: 'success',
	ERROR: 'error'
} as const;

/** Human-readable labels for each file type (UI). */
export const FILE_TYPE_LABELS: Record<string, string> = {
	[FILE_TYPE.INVOICE_SUMMARY]: 'Invoice Summary',
	[FILE_TYPE.CERTIFICACIONES_PDF]: 'Certificacion PDF',
	[FILE_TYPE.CREDIT_NOTES]: 'Notas de Credito',
	[FILE_TYPE.FACTURACION]: 'Facturacion',
	[FILE_TYPE.OTHER]: 'Otro'
};

/** Filename substring patterns → file type, evaluated in order. */
const DETECTION_RULES: { patterns: string[]; type: FileType }[] = [
	{ patterns: ['invoicesummary', 'invoice_summary', 'invoice summary'], type: FILE_TYPE.INVOICE_SUMMARY },
	{ patterns: ['credit', 'nota_credito', 'notacredito'], type: FILE_TYPE.CREDIT_NOTES },
	{ patterns: ['factura', 'billing'], type: FILE_TYPE.FACTURACION }
];

/** Detect the file type from a filename. */
export function detectFileType(filename: string): FileType {
	const lower = filename.toLowerCase();
	for (const rule of DETECTION_RULES) {
		if (rule.patterns.some((p) => lower.includes(p))) return rule.type;
	}
	if (lower.endsWith('.pdf')) return FILE_TYPE.CERTIFICACIONES_PDF;
	return FILE_TYPE.OTHER;
}

export const FILE_TYPE_OPTIONS = Object.entries(FILE_TYPE_LABELS).map(([value, label]) => ({
	value,
	label
}));
