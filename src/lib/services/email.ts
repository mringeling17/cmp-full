import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';

const SMTP_HOST = env.SMTP_HOST ?? 'mail.crossmediaplay.com';
const SMTP_PORT = env.SMTP_PORT ?? '465';
const SMTP_EMAIL = env.SMTP_EMAIL ?? '';
const SMTP_PASSWORD = env.SMTP_PASSWORD ?? '';

const DEFAULT_EMAILS = [
	'trafico.ar@crossmediaplay.com',
	'alvaro.ilic@crossmediaplay.com'
];

const ERROR_EMAILS = ['matias.ringeling@crossmediaplay.com'];

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
 * Returns the Spanish month name (capitalized) and year for the previous month.
 * Replicates Python's: mes_anterior = datetime.today().replace(day=1) - timedelta(days=1)
 * with locale.setlocale(locale.LC_TIME, 'es_ES.UTF-8') and strftime("%B").capitalize()
 */
export function getPreviousMonthInfo(): { name: string; year: number } {
	const SPANISH_MONTHS = [
		'Enero',
		'Febrero',
		'Marzo',
		'Abril',
		'Mayo',
		'Junio',
		'Julio',
		'Agosto',
		'Septiembre',
		'Octubre',
		'Noviembre',
		'Diciembre'
	];

	const today = new Date();
	// Go to day 1 of current month, then subtract 1 day to get last day of previous month
	const firstDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
	const lastDayOfPrevMonth = new Date(firstDayOfCurrentMonth.getTime() - 86400000);

	return {
		name: SPANISH_MONTHS[lastDayOfPrevMonth.getMonth()],
		year: lastDayOfPrevMonth.getFullYear()
	};
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
