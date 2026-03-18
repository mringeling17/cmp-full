import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

export type ValueMode = 'net' | 'gross';

const stored = browser ? (localStorage.getItem('cmp-value-mode') as ValueMode) : null;
export const valueMode = writable<ValueMode>(
	stored === 'gross' ? 'gross' : 'net'
);

if (browser) {
	valueMode.subscribe((value) => localStorage.setItem('cmp-value-mode', value));
}

export const valueField = derived(valueMode, ($mode) =>
	$mode === 'net' ? 'net_value' : 'gross_value'
);

export const valueLabel = derived(valueMode, ($mode) =>
	$mode === 'net' ? 'Neta' : 'Bruta'
);
