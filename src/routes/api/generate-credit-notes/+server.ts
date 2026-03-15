import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAdminClient } from '$lib/services/supabase-admin';
import {
	parseInvoiceSummary,
	parseXubioFile,
	crossInvoiceSummaryWithXubio,
	generateCreditNotesExcel
} from '$lib/services/excel';

export const POST: RequestHandler = async ({ request }) => {
	const supabase = createAdminClient();

	try {
		const formData = await request.formData();
		const invoiceSummaryFileId = formData.get('invoiceSummaryFileId') as string | null;
		const xubioFile = formData.get('xubioFile') as File | null;

		if (!invoiceSummaryFileId) {
			return json({ success: false, error: 'Falta el ID del Invoice Summary' }, { status: 400 });
		}
		if (!xubioFile) {
			return json({ success: false, error: 'Falta el archivo Xubio' }, { status: 400 });
		}

		// 1. Get Invoice Summary from DB and download from storage
		const { data: fileRecord, error: dbErr } = await supabase
			.from('files')
			.select('storage_path, filename')
			.eq('id', invoiceSummaryFileId)
			.single();

		if (dbErr || !fileRecord) {
			return json({ success: false, error: 'Invoice Summary no encontrado' }, { status: 404 });
		}

		const { data: isBlob, error: isDlErr } = await supabase.storage
			.from('uploads')
			.download(fileRecord.storage_path);

		if (isDlErr || !isBlob) {
			return json({ success: false, error: 'No se pudo descargar el Invoice Summary' }, { status: 500 });
		}

		// 2. Parse both files
		const isBuffer = await isBlob.arrayBuffer();
		const { rows: invoiceRows, month, year } = parseInvoiceSummary(isBuffer, fileRecord.filename);

		const xubioBuffer = await xubioFile.arrayBuffer();
		const xubioRows = parseXubioFile(xubioBuffer);

		// 3. Cross-reference by OBSERVACIONES
		const { matches, unmatched } = crossInvoiceSummaryWithXubio(invoiceRows, xubioRows);

		if (matches.length === 0) {
			return json({
				success: false,
				error: `No se encontraron coincidencias entre Invoice Summary (${invoiceRows.length} filas) y Xubio (${xubioRows.length} filas). Verificar que las observaciones coincidan.`,
				unmatched: unmatched.slice(0, 10)
			}, { status: 400 });
		}

		// 4. Generate credit notes Excel
		const outputBuffer = generateCreditNotesExcel(matches, month, year);

		// 5. Build output path and upload
		const SPANISH_MONTHS = [
			'', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
			'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
		];
		const monthName = SPANISH_MONTHS[month] ?? '';
		const outputFilename = `NotasCredito_${monthName}_${year}_AR.xlsx`;
		const outputPath = `processed/${outputFilename}`;

		// Remove existing if any, then upload
		await supabase.storage.from('uploads').remove([outputPath]);
		await supabase.storage.from('uploads').upload(outputPath, outputBuffer, {
			contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			upsert: true
		});

		// 6. Record in files table
		await supabase.from('files').insert({
			filename: outputFilename,
			storage_path: outputPath,
			file_type: 'credit_notes',
			status: 'active',
			processed: true,
			uploaded_at: new Date().toISOString(),
			processed_at: new Date().toISOString()
		});

		// 7. Log
		await supabase.from('files_log').insert({
			path: outputFilename,
			status: 'success',
			message: `Generated ${matches.length} credit notes. ${unmatched.length} unmatched invoices.`,
			created_at: new Date().toISOString()
		});

		return json({
			success: true,
			matched: matches.length,
			unmatched: unmatched.length,
			unmatchedSample: unmatched.slice(0, 5),
			outputPath,
			outputFilename
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return json({ success: false, error: message }, { status: 500 });
	}
};
