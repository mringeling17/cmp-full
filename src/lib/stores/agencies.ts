import { writable } from 'svelte/store';
import { createSupabaseBrowserClient } from '$lib/services/supabase';
import { toastError } from '$lib/stores/toast';

const supabase = createSupabaseBrowserClient();

export interface AgencyWithContacts {
	id: string;
	name: string;
	country: string | null;
	receives_credit_note: boolean;
	contacts: AgencyContact[];
}

export interface AgencyContact {
	id: string;
	name: string;
	phone: string | null;
	mobile: string | null;
	email: string | null;
	position: string | null;
	is_primary: boolean | null;
}

export const agenciesList = writable<AgencyWithContacts[]>([]);
export const agenciesLoading = writable(false);

export async function fetchAgencies(country: string) {
	agenciesLoading.set(true);

	const { data: agencies, error: agenciesError } = await supabase
		.from('agencies')
		.select('id, name, country, receives_credit_note')
		.eq('country', country)
		.order('name');

	if (agenciesError) {
		console.error('Error fetching agencies:', agenciesError);
		toastError('Error al cargar agencias');
		agenciesLoading.set(false);
		return;
	}

	const agencyIds = agencies?.map((a) => a.id) ?? [];
	const { data: contacts, error: contactsError } = await supabase
		.from('agency_contacts')
		.select('id, agency_id, name, phone, mobile, email, position, is_primary')
		.in('agency_id', agencyIds.length > 0 ? agencyIds : ['none']);

	if (contactsError) {
		console.error('Error fetching agency contacts:', contactsError);
	}

	const contactMap = new Map<string, AgencyContact[]>();
	contacts?.forEach((c) => {
		if (!c.agency_id) return;
		const list = contactMap.get(c.agency_id) ?? [];
		list.push({
			id: c.id,
			name: c.name,
			phone: c.phone,
			mobile: c.mobile,
			email: c.email,
			position: c.position,
			is_primary: c.is_primary
		});
		contactMap.set(c.agency_id, list);
	});

	const enriched = (agencies ?? []).map((a) => ({
		...a,
		contacts: contactMap.get(a.id) ?? []
	}));

	agenciesList.set(enriched);
	agenciesLoading.set(false);
}

export async function createAgency(name: string, country: string) {
	const { data, error } = await supabase
		.from('agencies')
		.insert({ name, country })
		.select('id')
		.single();
	if (error) throw error;
	return data;
}

export async function updateAgency(
	agencyId: string,
	fields: { name?: string; receives_credit_note?: boolean }
) {
	const { error } = await supabase.from('agencies').update(fields).eq('id', agencyId);
	if (error) throw error;
}

export async function deleteAgency(agencyId: string) {
	// Delete agency_contacts first
	await supabase.from('agency_contacts').delete().eq('agency_id', agencyId);
	// Delete agency
	const { error } = await supabase.from('agencies').delete().eq('id', agencyId);
	if (error) throw error;
}

export async function addAgencyContact(
	agencyId: string,
	contact: {
		name: string;
		phone?: string;
		mobile?: string;
		email?: string;
		position?: string;
		is_primary?: boolean;
	}
) {
	const { data, error } = await supabase
		.from('agency_contacts')
		.insert({
			agency_id: agencyId,
			name: contact.name,
			phone: contact.phone ?? null,
			mobile: contact.mobile ?? null,
			email: contact.email ?? null,
			position: contact.position ?? null,
			is_primary: contact.is_primary ?? false
		})
		.select('id')
		.single();
	if (error) throw error;
	return data;
}

export async function removeAgencyContact(contactId: string) {
	const { error } = await supabase.from('agency_contacts').delete().eq('id', contactId);
	if (error) throw error;
}
