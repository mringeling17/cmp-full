import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAdminClient } from '$lib/services/supabase-admin';
import { parseInvoiceSummary, generateBillingExcel } from '$lib/services/excel';
import { parsePeriodPart, validatePeriodOverride } from '$lib/utils/period';
import { STORAGE_BUCKET, PROCESSED_PREFIX } from '$lib/config/constants';
import { getEnglishMonthName, resolveBillingCountry } from '$lib/config/locale';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || locals.user.app_metadata?.role !== 'admin') {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const supabase = createAdminClient();

	try {
		const body = await request.json();
		const fileId = body.fileId as string | null;

		if (!fileId) return json({ success: false, error: 'No fileId provided' }, { status: 400 });

		const monthParsed = parsePeriodPart(body.month);
		const yearParsed = parsePeriodPart(body.year);
		if (!monthParsed.valid || !yearParsed.valid) {
			return json({ success: false, error: 'Mes o año inválido' }, { status: 400 });
		}
		const overrideMonth = monthParsed.value;
		const overrideYear = yearParsed.value;

		const periodError = validatePeriodOverride(overrideMonth, overrideYear);
		if (periodError) {
			return json({ success: false, error: periodError }, { status: 400 });
		}

		// Get file record from DB
		const { data: fileRecord, error: dbErr } = await supabase
			.from('files')
			.select('storage_path, filename')
			.eq('id', fileId)
			.single();

		if (dbErr || !fileRecord) return json({ success: false, error: 'Archivo no encontrado' }, { status: 404 });

		// Download file server-side from Supabase Storage
		const { data: fileBlob, error: dlErr } = await supabase.storage
			.from(STORAGE_BUCKET)
			.download(fileRecord.storage_path);

		if (dlErr || !fileBlob) return json({ success: false, error: 'No se pudo descargar el archivo' }, { status: 500 });

		const buffer = await fileBlob.arrayBuffer();
		const { rows, country, month, year, errors: parseErrors } = parseInvoiceSummary(
			buffer,
			fileRecord.filename,
			{ overrideMonth, overrideYear }
		);

		if (parseErrors.length > 0) {
			// Log validation errors
			for (const err of parseErrors) {
				await supabase.from('files_log').insert({
					path: fileRecord.filename,
					status: 'error',
					message: err,
					created_at: new Date().toISOString()
				});
			}
		}

		const results = { created: 0, updated: 0, skipped: 0, errors: [...parseErrors] };
		// Count only genuine per-row failures (a thrown error in the loop below).
		// Parse warnings and the non-fatal client_agency_periods warning go to
		// results.errors but must NOT block the source file from being marked
		// processed when every invoice row actually succeeded.
		let rowFailures = 0;

		for (const row of rows) {
			try {
				// Get or create agency
				let agency: { id: string };
				const { data: existingAgency } = await supabase
					.from('agencies')
					.select('id')
					.eq('name', row.agency)
					.eq('country', country)
					.maybeSingle();

				if (existingAgency) {
					agency = existingAgency;
				} else {
					const { data: newAgency, error } = await supabase
						.from('agencies')
						.insert({ name: row.agency, country })
						.select('id')
						.single();
					if (error) throw error;
					agency = newAgency;
				}

				// Get or create client
				let client: { id: string };
				const { data: existingClient } = await supabase
					.from('clients')
					.select('id')
					.eq('name', row.client)
					.eq('country', country)
					.maybeSingle();

				if (existingClient) {
					client = existingClient;
				} else {
					const { data: newClient, error } = await supabase
						.from('clients')
						.insert({ name: row.client, country })
						.select('id')
						.single();
					if (error) throw error;
					client = newClient;

					// Create agency period for new client
					const { error: capErr } = await supabase
						.from('client_agency_periods')
						.insert({
							client_id: newClient.id,
							agency_id: agency.id,
							start_date: new Date().toISOString().split('T')[0]
						});
					if (capErr) {
						results.errors.push(
							`Cliente ${row.client}: no se pudo crear el período cliente-agencia (${capErr.message})`
						);
					}
				}

				// Normalize document_type to '' (never null) so the duplicate
				// check below matches consistently — Postgres treats NULL != ''.
				const documentType = row.documentType ?? '';

				// Calculate invoice_date as last day of extracted month
				const lastDay = new Date(year, month, 0);
				const invoiceDate = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

				const invoiceData = {
					invoice_number: row.invoiceNumber,
					invoice_date: invoiceDate,
					gross_value: row.grossValue,
					net_value: row.netValue,
					channel: row.channel,
					agency: row.agency,
					order_reference: row.orderReference,
					client_id: client.id,
					country,
					product: row.product,
					feed: row.feed,
					campaign_number: row.campaignNumber,
					commission_percent: row.commissionPercent,
					commission_amount: row.commissionAmount,
					sales_executive: row.salesExecutive,
					system_source: row.systemSource,
					spot_count: row.spotCount,
					business_type: row.businessType,
					document_type: documentType,
					company_code: row.companyCode,
					channel_by_feed: row.channelByFeed,
					exhibition_month: `${year}-${String(month).padStart(2, '0')}`,
					created_at: new Date().toISOString()
				};

				// Check if exists by (invoice_number, exhibition_month, country, document_type)
				const { data: existing } = await supabase
					.from('invoices')
					.select('id')
					.eq('invoice_number', row.invoiceNumber)
					.eq('exhibition_month', `${year}-${String(month).padStart(2, '0')}`)
					.eq('country', country)
					.eq('document_type', documentType)
					.maybeSingle();

				if (existing) {
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					const { created_at, ...updateData } = invoiceData;
					const { error: updErr } = await supabase
						.from('invoices')
						.update(updateData)
						.eq('id', existing.id);
					if (updErr) throw updErr;
					results.updated++;
				} else {
					const { error: insErr } = await supabase.from('invoices').insert(invoiceData);
					if (insErr) throw insErr;
					results.created++;
				}
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : String(err);
				results.errors.push(`Invoice ${row.invoiceNumber}: ${message}`);
				rowFailures++;
			}
		}

		// Generate billing output Excel
		const outputBuffer = generateBillingExcel(rows, month, year, country);
		const capitalizedMonth = getEnglishMonthName(month);
		const fileCountry = resolveBillingCountry(country).toUpperCase();
		const outputFilename = `Facturacion_${capitalizedMonth}_${fileCountry}.xlsx`;
		const outputPath = `${PROCESSED_PREFIX}${outputFilename}`;

		// Remove existing file if any
		await supabase.storage.from(STORAGE_BUCKET).remove([outputPath]);

		// Upload output — fail loudly if storage write fails
		const { error: uploadErr } = await supabase.storage
			.from(STORAGE_BUCKET)
			.upload(outputPath, outputBuffer, {
				contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				upsert: true
			});
		if (uploadErr) {
			await supabase.from('files_log').insert({
				path: fileRecord.filename,
				status: 'error',
				message: `Storage upload failed for ${outputPath}: ${uploadErr.message}`,
				created_at: new Date().toISOString()
			});
			return json(
				{ success: false, error: 'No se pudo guardar el archivo generado' },
				{ status: 500 }
			);
		}

		// Record output file in files table
		await supabase.from('files').insert({
			filename: outputFilename,
			storage_path: outputPath,
			file_type: 'facturacion',
			status: 'active',
			processed: true,
			uploaded_at: new Date().toISOString(),
			processed_at: new Date().toISOString()
		});

		// Only mark the source file processed if every invoice row succeeded —
		// otherwise it must remain re-processable. Advisory warnings (country
		// fallback, client_agency_periods) do not count.
		if (fileId && rowFailures === 0) {
			await supabase
				.from('files')
				.update({ processed: true, processed_at: new Date().toISOString() })
				.eq('id', fileId);
		}

		// Log success
		await supabase.from('files_log').insert({
			path: fileRecord.filename,
			status: 'success',
			message: `Processed ${rows.length} invoices (${results.created} created, ${results.updated} updated). Output: ${outputPath}`,
			created_at: new Date().toISOString()
		});

		return json({
			success: true,
			created: results.created,
			updated: results.updated,
			skipped: results.skipped,
			errors: results.errors,
			outputPath,
			country,
			totalRows: rows.length
		});
	} catch (err: unknown) {
		console.error('[process-excel] Error:', err);
		return json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
	}
};
