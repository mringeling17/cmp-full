import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';
import { previousMonthPeriod } from '$lib/utils/period';
import { getSpanishMonthName } from '$lib/config/locale';

const SMTP_HOST = env.SMTP_HOST ?? 'mail.crossmediaplay.com';
const SMTP_PORT = env.SMTP_PORT ?? '465';
const SMTP_EMAIL = env.SMTP_EMAIL ?? '';
const SMTP_PASSWORD = env.SMTP_PASSWORD ?? '';

/** Parse a comma/semicolon-separated env list into trimmed, non-empty emails. */
function parseEmailList(raw: string | undefined, fallback: string[]): string[] {
	if (!raw) return fallback;
	const list = raw
		.split(/[,;]/)
		.map((e) => e.trim())
		.filter(Boolean);
	return list.length > 0 ? list : fallback;
}

// Default certification recipients and error-notification recipients are
// configurable via env (DEFAULT_CERT_EMAILS / ERROR_NOTIFICATION_EMAILS).
// Fallbacks preserve the previous hardcoded behaviour.
const DEFAULT_EMAILS = parseEmailList(env.DEFAULT_CERT_EMAILS, [
	'trafico.ar@crossmediaplay.com',
	'alvaro.ilic@crossmediaplay.com'
]);

const ERROR_EMAILS = parseEmailList(env.ERROR_NOTIFICATION_EMAILS, [
	'matias.ringeling@crossmediaplay.com'
]);

export function getDefaultEmails(): string[] {
	return [...DEFAULT_EMAILS];
}

export function createTransporter() {
	return nodemailer.createTransport({
		host: SMTP_HOST,
		port: parseInt(SMTP_PORT),
		secure: true,
		auth: {
			user: SMTP_EMAIL,
			pass: SMTP_PASSWORD
		}
	});
}

/**
 * Returns the capitalized Spanish month name and year for the previous month.
 */
export function getPreviousMonthInfo(): { name: string; year: number } {
	const { month, year } = previousMonthPeriod();
	return { name: getSpanishMonthName(month), year };
}

export async function sendCertificationEmail(
	transporter: nodemailer.Transporter,
	toEmails: string[],
	clientName: string,
	attachments: { filename: string; content: Buffer }[]
) {
	const { name: monthName, year } = getPreviousMonthInfo();

	await transporter.sendMail({
		from: SMTP_EMAIL,
		to: toEmails.join(', '),
		subject: `Certificación mes ${monthName} ${year} - ${clientName}`,
		text: `Buenas tardes,\n\nAdjuntamos certificaciones correspondientes al mes de ${monthName} ${year}.\n\nSaludos cordiales.`,
		attachments: attachments.map((a) => ({
			filename: a.filename,
			content: a.content,
			contentType: 'application/pdf'
		}))
	});
}

export async function sendPasswordResetEmail(toEmail: string, resetUrl: string) {
	const transporter = createTransporter();
	await transporter.sendMail({
		from: SMTP_EMAIL,
		to: toEmail,
		subject: 'Restablecer contraseña - CMP Finance',
		html: `
			<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
				<h2 style="color: #333;">Restablecer contraseña</h2>
				<p>Recibimos una solicitud para restablecer tu contraseña en CMP Finance.</p>
				<p>
					<a href="${resetUrl}"
						style="display: inline-block; padding: 10px 24px; background: #18181b; color: #fff; text-decoration: none; border-radius: 6px;">
						Restablecer contraseña
					</a>
				</p>
				<p style="color: #666; font-size: 14px;">Este enlace expira en 1 hora. Si no solicitaste esto, ignora este mensaje.</p>
				<hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
				<p style="color: #999; font-size: 12px;">CMP Finance</p>
			</div>
		`
	});
}

export async function sendMissingEmailNotification(
	transporter: nodemailer.Transporter,
	clientName: string,
	filenames: string[]
) {
	await transporter.sendMail({
		from: SMTP_EMAIL,
		to: [...DEFAULT_EMAILS, ...ERROR_EMAILS].join(', '),
		subject: `[AVISO] Certificaciones sin correo del cliente - ${clientName}`,
		text: `Las siguientes certificaciones no fueron enviadas porque no se encontraron correos para el cliente ${clientName}:\n\n${filenames.join('\n')}`
	});
}
