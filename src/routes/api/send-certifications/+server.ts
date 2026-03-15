import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAdminClient } from '$lib/services/supabase-admin';
import {
	createTransporter,
	getDefaultEmails,
	sendCertificationEmail,
	sendMissingEmailNotification
} from '$lib/services/email';

export const POST: RequestHandler = async () => {
	const supabase = createAdminClient();

	try {
		// 1. Query pending certification files (last 5 days)
		const cutoffDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

		const { data: files } = await supabase
			.from('files')
			.select('id, filename, file_type, client_id, invoice_number, storage_path')
			.eq('file_type', 'certificaciones_pdf')
			.eq('processed', false)
			.eq('status', 'active')
			.gte('uploaded_at', cutoffDate);

		if (!files || files.length === 0) {
			return json({ message: 'No hay archivos pendientes' });
		}

		// 2. Group by client_id via invoice_number extraction from filename
		const grouped = new Map<
			string,
			{ file_id: string; invoice_number: string; filename: string; storage_path: string }[]
		>();

		for (const f of files) {
			// Extract invoice_number from filename
			const parts = f.filename.split('_');
			const lastPart = parts[parts.length - 1];
			const invoiceNumber = lastPart.toLowerCase().endsWith('.pdf')
				? lastPart.slice(0, -4)
				: lastPart;

			// Validate: must be all digits
			if (!invoiceNumber || !/^\d+$/.test(invoiceNumber)) {
				console.log(
					`⚠️ Invoice inválido: ${invoiceNumber}, saltando archivo: ${f.filename}`
				);
				continue;
			}

			// Lookup invoice, with .0 fallback
			let { data: invoiceData } = await supabase
				.from('invoices')
				.select('client_id')
				.eq('invoice_number', invoiceNumber)
				.limit(1)
				.maybeSingle();

			if (!invoiceData) {
				const { data: fallback } = await supabase
					.from('invoices')
					.select('client_id')
					.eq('invoice_number', `${invoiceNumber}.0`)
					.limit(1)
					.maybeSingle();
				invoiceData = fallback;
			}

			if (!invoiceData) {
				console.log(
					`⚠️ No se encontró invoice con número ${invoiceNumber} ni ${invoiceNumber}.0`
				);
				continue;
			}

			const clientId = invoiceData.client_id!;
			const list = grouped.get(clientId) ?? [];
			list.push({
				file_id: f.id,
				invoice_number: invoiceNumber,
				filename: f.filename,
				storage_path: f.storage_path
			});
			grouped.set(clientId, list);
		}

		if (grouped.size === 0) {
			return json({ message: 'No se encontraron facturas válidas para enviar.' });
		}

		const transporter = createTransporter();
		let enviados = 0;
		let sinCorreo = 0;
		let clientesSinCorreo = 0;

		for (const [clientId, flist] of grouped) {
			// Get client emails
			const { data: clientEmailIds } = await supabase
				.from('client_emails')
				.select('email_id')
				.eq('client_id', clientId);

			const clientEmails: string[] = [];
			for (const rec of clientEmailIds ?? []) {
				if (!rec.email_id) continue;
				const { data: emailRec } = await supabase
					.from('emails')
					.select('email')
					.eq('id', rec.email_id)
					.single();
				if (emailRec) clientEmails.push(emailRec.email);
			}

			// Get client name
			const { data: clientData } = await supabase
				.from('clients')
				.select('name')
				.eq('id', clientId)
				.limit(1)
				.single();
			const clientName = clientData?.name ?? clientId;

			if (clientEmails.length === 0) {
				// No client emails - send notification only, do NOT mark as processed
				const filenames = flist.map((item) => item.filename);
				await sendMissingEmailNotification(transporter, clientName, filenames);
				sinCorreo += filenames.length;
				clientesSinCorreo++;
				continue;
			}

			const toEmails = [...getDefaultEmails(), ...clientEmails];

			// Download PDFs from storage
			const attachments: { filename: string; content: Buffer }[] = [];
			for (const item of flist) {
				const { data: fileData, error } = await supabase.storage
					.from('uploads')
					.download(item.storage_path);
				if (error || !fileData) continue;
				const buffer = Buffer.from(await fileData.arrayBuffer());
				attachments.push({ filename: item.filename, content: buffer });
			}

			// Skip if no attachments could be downloaded
			if (attachments.length === 0) {
				console.log(`⚠️ No se pudieron descargar archivos para ${clientName}`);
				continue;
			}

			// Send email
			try {
				await sendCertificationEmail(transporter, toEmails, clientName, attachments);

				// Mark files as processed only after successful send
				const now = new Date().toISOString();
				for (const item of flist) {
					await supabase
						.from('files')
						.update({ processed: true, processed_at: now })
						.eq('id', item.file_id);
				}

				enviados += flist.length;
			} catch (err) {
				console.error(`❌ Error al enviar correo a ${toEmails}:`, err);
			}
		}

		return json({
			message: `${enviados} certificaciones agrupadas correctamente para envío, ${sinCorreo} no se enviaron por falta de correos de cliente (${clientesSinCorreo} clientes sin correo).`
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return json({ success: false, error: message }, { status: 500 });
	}
};
