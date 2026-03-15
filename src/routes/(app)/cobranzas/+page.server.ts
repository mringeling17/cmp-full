import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [paymentsRes, detailsRes, clientsRes, agenciesRes] = await Promise.all([
		locals.supabase.from('payments').select('*').order('payment_date', { ascending: false }),
		locals.supabase.from('payment_details').select('*, invoices:invoice_id(invoice_number, client_id, agency, clients(name))'),
		locals.supabase.from('clients').select('id, name, country').order('name'),
		locals.supabase.from('agencies').select('id, name, country').order('name')
	]);

	return {
		payments: paymentsRes.data ?? [],
		paymentDetails: detailsRes.data ?? [],
		clients: clientsRes.data ?? [],
		agencies: agenciesRes.data ?? []
	};
};
