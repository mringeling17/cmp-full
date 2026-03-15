import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

export type CountryCode = 'ar' | 'cl' | 'mx';

export interface CountryConfig {
	code: CountryCode;
	name: string;
	currency: string;
	currencySymbol: string;
	locale: string;
	flag: string;
}

export const COUNTRIES: Record<CountryCode, CountryConfig> = {
	ar: {
		code: 'ar',
		name: 'Argentina',
		currency: 'ARS',
		currencySymbol: '$',
		locale: 'es-AR',
		flag: '\u{1F1E6}\u{1F1F7}'
	},
	cl: {
		code: 'cl',
		name: 'Chile',
		currency: 'CLP',
		currencySymbol: '$',
		locale: 'es-CL',
		flag: '\u{1F1E8}\u{1F1F1}'
	},
	mx: {
		code: 'mx',
		name: 'Mexico',
		currency: 'MXN',
		currencySymbol: '$',
		locale: 'es-MX',
		flag: '\u{1F1F2}\u{1F1FD}'
	}
};

const stored = browser ? (localStorage.getItem('selectedCountry') as CountryCode) : null;
export const selectedCountry = writable<CountryCode>(
	stored && COUNTRIES[stored] ? stored : 'ar'
);

if (browser) {
	selectedCountry.subscribe((value) => localStorage.setItem('selectedCountry', value));
}

export const countryConfig = derived(selectedCountry, ($country) => COUNTRIES[$country]);
export const allCountries = Object.values(COUNTRIES);
