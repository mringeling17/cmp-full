import { writable } from 'svelte/store';
import { createSupabaseBrowserClient } from '$lib/services/supabase';
import { toastError } from '$lib/stores/toast';

const supabase = createSupabaseBrowserClient();

export interface ClientWithEmails {
	id: string;
	name: string;
	country: string | null;
	emails: string[];
}

export const clientsList = writable<ClientWithEmails[]>([]);
export const clientsLoading = writable(false);

export async function fetchClients(country: string) {
	clientsLoading.set(true);

	const { data: clients, error: clientsError } = await supabase
		.from('clients')
		.select('id, name, country')
		.eq('country', country)
		.order('name');

	if (clientsError) {
		console.error('Error fetching clients:', clientsError);
		toastError('Error al cargar clientes');
		clientsLoading.set(false);
		return;
	}

	// Fetch emails for all clients
	const clientIds = clients?.map((c) => c.id) ?? [];
	const { data: clientEmails, error: emailsError } = await supabase
		.from('client_emails')
		.select('client_id, emails:email_id(email)')
		.in('client_id', clientIds.length > 0 ? clientIds : ['none']);

	if (emailsError) {
		console.error('Error fetching client emails:', emailsError);
	}

	const emailMap = new Map<string, string[]>();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	clientEmails?.forEach((ce: any) => {
		const list = emailMap.get(ce.client_id) ?? [];
		if (ce.emails?.email) list.push(ce.emails.email);
		emailMap.set(ce.client_id, list);
	});

	const enriched = (clients ?? []).map((c) => ({
		...c,
		emails: emailMap.get(c.id) ?? []
	}));

	clientsList.set(enriched);
	clientsLoading.set(false);
}

export async function createClient(name: string, country: string) {
	const { data, error } = await supabase
		.from('clients')
		.insert({ name, country })
		.select('id')
		.single();
	if (error) throw error;
	return data;
}

export async function updateClient(
	clientId: string,
	fields: { name?: string }
) {
	const { error } = await supabase.from('clients').update(fields).eq('id', clientId);
	if (error) throw error;
}

export async function deleteClient(clientId: string) {
	// Delete client_emails first (junction table)
	await supabase.from('client_emails').delete().eq('client_id', clientId);
	// Delete client_contacts
	await supabase.from('client_contacts').delete().eq('client_id', clientId);
	// Delete client
	const { error } = await supabase.from('clients').delete().eq('id', clientId);
	if (error) throw error;
}

export async function addEmailToClient(clientId: string, email: string) {
	// First, get or create the email in the emails table
	let { data: existing } = await supabase.from('emails').select('id').eq('email', email).single();

	if (!existing) {
		const { data: newEmail, error } = await supabase
			.from('emails')
			.insert({ email })
			.select('id')
			.single();
		if (error) throw error;
		existing = newEmail;
	}

	// Then link via client_emails
	const { error } = await supabase
		.from('client_emails')
		.insert({ client_id: clientId, email_id: existing!.id });
	if (error) throw error;
}

export async function removeEmailFromClient(clientId: string, email: string) {
	// Find the email_id
	const { data: emailRecord } = await supabase
		.from('emails')
		.select('id')
		.eq('email', email)
		.single();
	if (!emailRecord) return;

	const { error } = await supabase
		.from('client_emails')
		.delete()
		.eq('client_id', clientId)
		.eq('email_id', emailRecord.id);
	if (error) throw error;
}
