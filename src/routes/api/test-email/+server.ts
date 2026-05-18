import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createTransporter } from '$lib/services/email';
import { requireAdmin } from '$lib/server/auth';
import { EMAIL_DOMAIN } from '$lib/config/constants';
import { env } from '$env/dynamic/private';

const SMTP_EMAIL = env.SMTP_EMAIL ?? '';
const ALLOWED_TEST_DOMAINS = [EMAIL_DOMAIN];

export const POST: RequestHandler = async ({ request, locals }) => {
	const denied = requireAdmin(locals);
	if (denied) return denied;

	try {
		const { to } = await request.json();

		if (!to || typeof to !== 'string' || !to.includes('@')) {
			return json({ success: false, error: 'Email destinatario inválido' }, { status: 400 });
		}

		const domain = to.split('@')[1]?.toLowerCase();
		if (!domain || !ALLOWED_TEST_DOMAINS.includes(domain)) {
			return json({ success: false, error: `Solo se permiten destinatarios @${EMAIL_DOMAIN}` }, { status: 403 });
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
		console.error('[test-email] Error:', err);
		return json({ success: false, error: 'Error al enviar correo de prueba' }, { status: 500 });
	}
};
