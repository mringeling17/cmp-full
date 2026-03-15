import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createTransporter } from '$lib/services/email';
import { env } from '$env/dynamic/private';

const SMTP_EMAIL = env.SMTP_EMAIL ?? '';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { to } = await request.json();

		if (!to || typeof to !== 'string' || !to.includes('@')) {
			return json({ success: false, error: 'Email destinatario inválido' }, { status: 400 });
		}

		const transporter = createTransporter();

		await transporter.sendMail({
			from: SMTP_EMAIL,
			to,
			subject: '[TEST] CMP Finance - Prueba de envío de correo',
			text: `Este es un correo de prueba enviado desde CMP Finance.\n\nFecha: ${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}\nDesde: ${SMTP_EMAIL}\nHacia: ${to}\n\nSi recibiste este correo, la configuración SMTP está funcionando correctamente.`
		});

		return json({ success: true, message: `Correo de prueba enviado a ${to}` });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return json({ success: false, error: message }, { status: 500 });
	}
};
