import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const allowed = locals.allowedCountries;

	let clientsQuery = locals.supabase.from('clients').select('id, name, country').order('name');
	let agenciesQuery = locals.supabase.from('agencies').select('id, name, country').order('name');

	if (allowed) {
		clientsQuery = clientsQuery.in('country', allowed);
		agenciesQuery = agenciesQuery.in('country', allowed);
	}

	const [paymentsRes, detailsRes, clientsRes, agenciesRes] = await Promise.all([
		locals.supabase.from('payments').select('*').order('payment_date', { ascending: false }),
		locals.supabase.from('payment_details').select('*, invoices:invoice_id(invoice_number, net_value, document_type, client_id, agency, agency_id, clients(name))'),
		clientsQuery,
		agenciesQuery
	]);

	return {
		payments: paymentsRes.data ?? [],
		paymentDetails: detailsRes.data ?? [],
		clients: clientsRes.data ?? [],
		agencies: agenciesRes.data ?? []
	};
};
