import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAdminClient } from '$lib/services/supabase-admin';
import { parseInvoiceSummary } from '$lib/services/excel';
import { STORAGE_BUCKET } from '$lib/config/constants';
import { requireAdmin } from '$lib/server/auth';

/**
 * Detects the billing period of an uploaded Invoice Summary WITHOUT writing
 * anything. Used by the UI to pre-fill the period selector with the file's
 * own period (Excel header / filename) instead of a blind "previous month",
 * which previously caused files to be loaded under the wrong month.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const denied = requireAdmin(locals);
	if (denied) return denied;

	const supabase = createAdminClient();

	try {
		const body = await request.json();
		const fileId = body.fileId as string | null;
		if (!fileId) return json({ success: false, error: 'No fileId provided' }, { status: 400 });

		const { data: fileRecord, error: dbErr } = await supabase
			.from('files')
			.select('storage_path, filename')
			.eq('id', fileId)
			.single();
		if (dbErr || !fileRecord) {
			return json({ success: false, error: 'Archivo no encontrado' }, { status: 404 });
		}

		const { data: fileBlob, error: dlErr } = await supabase.storage
			.from(STORAGE_BUCKET)
			.download(fileRecord.storage_path);
		if (dlErr || !fileBlob) {
			return json({ success: false, error: 'No se pudo descargar el archivo' }, { status: 500 });
		}

		const buffer = await fileBlob.arrayBuffer();
		// No override: we want the file's own detected period.
		const { month, year, country, periodSource, rows } = parseInvoiceSummary(
			buffer,
			fileRecord.filename
		);

		return json({
			success: true,
			month,
			year,
			country,
			periodSource,
			totalRows: rows.length
		});
	} catch (err: unknown) {
		console.error('[detect-period] Error:', err);
		return json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
	}
};
