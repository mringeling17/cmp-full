const TAX_RATES: Record<string, number> = {
	ar: 0.21,
	cl: 0.19,
	mx: 0.16
};

/** Get tax multiplier for gross-to-net conversion. ar=1.21, cl=1.19, mx=1.16 */
export function getTaxMultiplier(country: string): number {
	return 1 + (TAX_RATES[country] ?? 0);
}

/** Get tax rate as decimal. ar=0.21, cl=0.19, mx=0.16 */
export function getTaxRate(country: string): number {
	return TAX_RATES[country] ?? 0;
}

/** Calculate tax amount from gross value */
export function calculateTax(grossValue: number, country: string): number {
	return Math.round(grossValue * getTaxRate(country) * 100) / 100;
}

/** Calculate net from gross */
export function grossToNet(grossValue: number, country: string): number {
	return Math.round((grossValue / getTaxMultiplier(country)) * 100) / 100;
}
