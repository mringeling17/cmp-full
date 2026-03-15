import { writable } from 'svelte/store';

export interface FilterState {
	dateFrom: string | null;
	dateTo: string | null;
	clientIds: string[];
	agencyIds: string[];
	channels: string[];
}

export const filters = writable<FilterState>({
	dateFrom: null,
	dateTo: null,
	clientIds: [],
	agencyIds: [],
	channels: []
});

export function resetFilters() {
	filters.set({
		dateFrom: null,
		dateTo: null,
		clientIds: [],
		agencyIds: [],
		channels: []
	});
}
