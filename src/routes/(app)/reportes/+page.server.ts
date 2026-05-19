import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [invoicesRes, clientsRes, agenciesRes, paymentsRes, detailsRes] = await Promise.all([
		locals.supabase
			.from('invoices')
			.select('*, clients(name)')
			.eq('hidden', false)
			.order('invoice_date', { ascending: false }),
		locals.supabase.from('clients').select('id, name, country').order('name'),
		locals.supabase.from('agencies').select('id, name, country').order('name'),
		locals.supabase.from('payments').select('*'),
		locals.supabase
			.from('payment_details')
			.select(
				'*, invoices:invoice_id(invoice_number, net_value, document_type, client_id, agency, agency_id, clients(name))'
			)
	]);

	return {
		invoices: invoicesRes.data ?? [],
		clients: clientsRes.data ?? [],
		agencies: agenciesRes.data ?? [],
		payments: paymentsRes.data ?? [],
		paymentDetails: detailsRes.data ?? []
	};
};
