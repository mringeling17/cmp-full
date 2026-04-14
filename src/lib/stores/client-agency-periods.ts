import { writable } from 'svelte/store';
import { createSupabaseBrowserClient } from '$lib/services/supabase';
import { toastError } from '$lib/stores/toast';

const supabase = createSupabaseBrowserClient();

export interface ClientAgencyPeriod {
	id: string;
	client_id: string;
	agency_id: string;
	start_date: string;
	end_date: string | null;
	created_at: string;
}

export const clientAgencyPeriods = writable<ClientAgencyPeriod[]>([]);

export async function fetchClientAgencyPeriods(clientId: string) {
	const { data, error } = await supabase
		.from('client_agency_periods')
		.select('*')
		.eq('client_id', clientId)
		.order('start_date', { ascending: false });

	if (error) {
		console.error('Error fetching client agency periods:', error);
		toastError('Error al cargar períodos de agencia');
		return;
	}

	clientAgencyPeriods.set(data ?? []);
}

export async function createClientAgencyPeriod(period: {
	client_id: string;
	agency_id: string;
	start_date: string;
	end_date?: string | null;
}) {
	// Validate no overlap
	const { data: existing } = await supabase
		.from('client_agency_periods')
		.select('id, start_date, end_date')
		.eq('client_id', period.client_id)
		.order('start_date');

	if (existing) {
		for (const ex of existing) {
			if (periodsOverlap(ex.start_date, ex.end_date, period.start_date, period.end_date ?? null)) {
				throw new Error('El período se solapa con uno existente');
			}
		}
	}

	const { error } = await supabase.from('client_agency_periods').insert(period);
	if (error) throw error;
}

export async function updateClientAgencyPeriod(
	id: string,
	clientId: string,
	fields: { agency_id?: string; start_date?: string; end_date?: string | null }
) {
	// Validate no overlap with other periods (excluding this one)
	if (fields.start_date !== undefined || fields.end_date !== undefined) {
		const { data: existing } = await supabase
			.from('client_agency_periods')
			.select('id, start_date, end_date')
			.eq('client_id', clientId)
			.neq('id', id)
			.order('start_date');

		const { data: current } = await supabase
			.from('client_agency_periods')
			.select('start_date, end_date')
			.eq('id', id)
			.single();

		if (existing && current) {
			const newStart = fields.start_date ?? current.start_date;
			const newEnd = fields.end_date !== undefined ? fields.end_date : current.end_date;
			for (const ex of existing) {
				if (periodsOverlap(ex.start_date, ex.end_date, newStart, newEnd)) {
					throw new Error('El período se solapa con uno existente');
				}
			}
		}
	}

	const { error } = await supabase.from('client_agency_periods').update(fields).eq('id', id);
	if (error) throw error;
}

export async function deleteClientAgencyPeriod(id: string) {
	const { error } = await supabase.from('client_agency_periods').delete().eq('id', id);
	if (error) throw error;
}

function periodsOverlap(
	startA: string,
	endA: string | null,
	startB: string,
	endB: string | null
): boolean {
	const sA = new Date(startA);
	const eA = endA ? new Date(endA) : new Date('9999-12-31');
	const sB = new Date(startB);
	const eB = endB ? new Date(endB) : new Date('9999-12-31');
	return sA <= eB && sB <= eA;
}

export function getActiveAgency(
	periods: ClientAgencyPeriod[],
	date: Date = new Date()
): ClientAgencyPeriod | undefined {
	const d = date.toISOString().split('T')[0];
	return periods.find((p) => {
		if (p.start_date > d) return false;
		if (p.end_date && p.end_date < d) return false;
		return true;
	});
}
