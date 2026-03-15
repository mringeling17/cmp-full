import { writable } from 'svelte/store';
import { createSupabaseBrowserClient } from '$lib/services/supabase';
import { toastError } from '$lib/stores/toast';

const supabase = createSupabaseBrowserClient();

export interface PaymentWithDetails {
	id: string;
	amount: number;
	payment_date: string;
	reference: string;
	country: string;
	notes: string | null;
	created_at: string;
	details?: PaymentDetail[];
}

export interface PaymentDetail {
	id: string;
	payment_id: string;
	invoice_id: string;
	amount: number;
	payment_type: string;
	invoice?: {
		invoice_number: string;
		client_id: string;
		gross_value: number | null;
		clients?: { name: string } | null;
	};
}

export const paymentsList = writable<PaymentWithDetails[]>([]);
export const paymentsLoading = writable(false);
export const paymentsTotal = writable(0);

export async function fetchPayments(params: {
	country: string;
	dateFrom?: string | null;
	dateTo?: string | null;
	search?: string;
}) {
	paymentsLoading.set(true);
	const { country, dateFrom, dateTo, search } = params;

	let query = supabase
		.from('payments')
		.select('*', { count: 'exact' })
		.eq('country', country)
		.order('payment_date', { ascending: false });

	if (dateFrom) query = query.gte('payment_date', dateFrom);
	if (dateTo) query = query.lte('payment_date', dateTo);
	if (search) query = query.or(`reference.ilike.%${search}%,notes.ilike.%${search}%`);

	const { data, count, error } = await query;

	if (error) {
		console.error('Error fetching payments:', error);
		toastError('Error al cargar pagos');
		paymentsLoading.set(false);
		return;
	}

	paymentsList.set(data ?? []);
	paymentsTotal.set(count ?? 0);
	paymentsLoading.set(false);
}

export async function fetchPaymentDetails(paymentId: string): Promise<PaymentDetail[]> {
	const { data, error } = await supabase
		.from('payment_details')
		.select('*, invoices:invoice_id(invoice_number, client_id, gross_value, clients(name))')
		.eq('payment_id', paymentId);

	if (error) {
		console.error('Error fetching payment details:', error);
		toastError('Error al cargar detalle del pago');
		return [];
	}

	return (data ?? []).map((d) => ({
		...d,
		invoice: d.invoices as any
	}));
}

export async function createPayment(payment: {
	amount: number;
	payment_date: string;
	reference: string;
	country: string;
	notes?: string;
	details: { invoice_id: string; amount: number; payment_type: string }[];
}) {
	// Insert payment
	const { data: newPayment, error: paymentError } = await supabase
		.from('payments')
		.insert({
			amount: payment.amount,
			payment_date: payment.payment_date,
			reference: payment.reference,
			country: payment.country,
			notes: payment.notes ?? null
		})
		.select('id')
		.single();

	if (paymentError) throw paymentError;

	// Insert payment details
	const details = payment.details.map((d) => ({
		payment_id: newPayment.id,
		invoice_id: d.invoice_id,
		amount: d.amount,
		payment_type: d.payment_type
	}));

	const { error: detailsError } = await supabase.from('payment_details').insert(details);

	if (detailsError) throw detailsError;

	return newPayment;
}

/** Fetch how much has already been paid for a set of invoices */
export async function fetchInvoicePaidAmounts(
	invoiceIds: string[]
): Promise<Map<string, number>> {
	if (invoiceIds.length === 0) return new Map();

	const { data, error } = await supabase
		.from('payment_details')
		.select('invoice_id, amount')
		.in('invoice_id', invoiceIds);

	if (error) {
		console.error('Error fetching paid amounts:', error);
		toastError('Error al cargar montos pagados');
		return new Map();
	}

	const map = new Map<string, number>();
	data?.forEach((p) => {
		map.set(p.invoice_id, (map.get(p.invoice_id) ?? 0) + p.amount);
	});

	return map;
}
