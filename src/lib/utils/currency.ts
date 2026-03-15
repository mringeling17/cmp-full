interface CurrencyConfig {
	code: string;
	symbol: string;
	locale: string;
	decimals: number;
}

const CURRENCY_CONFIGS: Record<string, CurrencyConfig> = {
	ar: { code: 'ARS', symbol: '$', locale: 'es-AR', decimals: 2 },
	cl: { code: 'CLP', symbol: '$', locale: 'es-CL', decimals: 0 },
	mx: { code: 'MXN', symbol: '$', locale: 'es-MX', decimals: 2 }
};

export function getCurrencyConfig(country: string): CurrencyConfig {
	return CURRENCY_CONFIGS[country] ?? CURRENCY_CONFIGS.ar;
}

export function formatCurrency(value: number | null | undefined, country: string): string {
	if (value == null) return '-';
	const config = getCurrencyConfig(country);
	return new Intl.NumberFormat(config.locale, {
		style: 'currency',
		currency: config.code,
		minimumFractionDigits: config.decimals,
		maximumFractionDigits: config.decimals
	}).format(value);
}

export function formatNumber(value: number | null | undefined, decimals: number = 2): string {
	if (value == null) return '-';
	return new Intl.NumberFormat('es', {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	}).format(value);
}
