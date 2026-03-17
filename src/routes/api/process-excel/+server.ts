import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAdminClient } from '$lib/services/supabase-admin';
import { parseInvoiceSummary, generateBillingExcel } from '$lib/services/excel';

export const POST: RequestHandler = async ({ request }) => {
	const supabase = createAdminClient();

	try {
		const body = await request.json();
		const fileId = body.fileId as string | null;

		if (!fileId) return json({ success: false, error: 'No fileId provided' }, { status: 400 });

		// Get file record from DB
		const { data: fileRecord, error: dbErr } = await supabase
			.from('files')
			.select('storage_path, filename')
			.eq('id', fileId)
			.single();

		if (dbErr || !fileRecord) return json({ success: false, error: 'Archivo no encontrado' }, { status: 404 });

		// Download file server-side from Supabase Storage
		const { data: fileBlob, error: dlErr } = await supabase.storage
			.from('uploads')
			.download(fileRecord.storage_path);

		if (dlErr || !fileBlob) return json({ success: false, error: 'No se pudo descargar el archivo' }, { status: 500 });

		const buffer = await fileBlob.arrayBuffer();
		const { rows, country, month, year, errors: parseErrors } = parseInvoiceSummary(
			buffer,
			fileRecord.filename
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
						.insert({ name: row.client, country, agency_id: agency.id })
						.select('id')
						.single();
					if (error) throw error;
					client = newClient;
				}

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
					document_type: row.documentType,
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
					.eq('document_type', row.documentType ?? '')
					.maybeSingle();

				if (existing) {
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					const { created_at, ...updateData } = invoiceData;
					await supabase.from('invoices').update(updateData).eq('id', existing.id);
					results.updated++;
				} else {
					await supabase.from('invoices').insert(invoiceData);
					results.created++;
				}
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : String(err);
				results.errors.push(`Invoice ${row.invoiceNumber}: ${message}`);
			}
		}

		// Generate billing output Excel
		const outputBuffer = generateBillingExcel(rows, month, year);
		const monthDate = new Date(year, month - 1, 1);
		const monthName = monthDate.toLocaleString('en', { month: 'long' });
		const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
		const outputPath = `processed/Facturacion_${capitalizedMonth}_${country.toUpperCase()}.xlsx`;

		// Remove existing file if any
		await supabase.storage.from('uploads').remove([outputPath]);

		// Upload output
		await supabase.storage.from('uploads').upload(outputPath, outputBuffer, {
			contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			upsert: true
		});

		// Record output file in files table
		await supabase.from('files').insert({
			filename: `Facturacion_${capitalizedMonth}_${country.toUpperCase()}.xlsx`,
			storage_path: outputPath,
			file_type: 'facturacion',
			status: 'active',
			processed: true,
			uploaded_at: new Date().toISOString(),
			processed_at: new Date().toISOString()
		});

		// Mark source file as processed if fileId provided
		if (fileId) {
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
		const message = err instanceof Error ? err.message : String(err);
		return json({ success: false, error: message }, { status: 500 });
	}
};
