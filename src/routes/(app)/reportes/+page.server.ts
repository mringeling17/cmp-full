import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [invoicesRes, clientsRes, agenciesRes] = await Promise.all([
		locals.supabase.from('invoices').select('*, clients(name)').order('invoice_date', { ascending: false }),
		locals.supabase.from('clients').select('id, name, country').order('name'),
		locals.supabase.from('agencies').select('id, name, country').order('name')
	]);

	return {
		invoices: invoicesRes.data ?? [],
		clients: clientsRes.data ?? [],
		agencies: agenciesRes.data ?? []
	};
};
