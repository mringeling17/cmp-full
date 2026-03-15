import { writable } from 'svelte/store';
import { createSupabaseBrowserClient } from '$lib/services/supabase';
import { toastError } from '$lib/stores/toast';
import type { Tables } from '$lib/types/database';

const supabase = createSupabaseBrowserClient();

export interface InvoiceWithClient extends Tables<'invoices'> {
	clients?: { name: string } | null;
	payment_status?: 'paid' | 'partial' | 'unpaid';
	total_paid?: number;
}

export const invoicesList = writable<InvoiceWithClient[]>([]);
export const invoicesLoading = writable(false);
export const invoicesTotal = writable(0);

export async function fetchInvoices(params: {
	country: string;
	page?: number;
	pageSize?: number;
	search?: string;
	clientIds?: string[];
	agencyIds?: string[];
	channels?: string[];
	dateFrom?: string | null;
	dateTo?: string | null;
	paymentStatus?: string;
	sortField?: string;
	sortDirection?: 'asc' | 'desc';
}) {
	invoicesLoading.set(true);

	const {
		country,
		page = 0,
		pageSize = 25,
		search,
		clientIds,
		agencyIds,
		channels,
		dateFrom,
		dateTo,
		sortField = 'invoice_date',
		sortDirection = 'desc'
	} = params;

	let query = supabase
		.from('invoices')
		.select('*, clients(name)', { count: 'exact' })
		.eq('country', country);

	if (search) {
		query = query.or(
			`invoice_number.ilike.%${search}%,agency.ilike.%${search}%,factura_interna.ilike.%${search}%`
		);
	}
	if (clientIds && clientIds.length > 0) {
		query = query.in('client_id', clientIds);
	}
	if (agencyIds && agencyIds.length > 0) {
		query = query.in('agency', agencyIds);
	}
	if (channels && channels.length > 0) {
		query = query.in('channel', channels);
	}
	if (dateFrom) {
		query = query.gte('invoice_date', dateFrom);
	}
	if (dateTo) {
		query = query.lte('invoice_date', dateTo);
	}

	query = query.order(sortField, { ascending: sortDirection === 'asc' });

	const from = page * pageSize;
	const to = from + pageSize - 1;
	query = query.range(from, to);

	const { data, count, error } = await query;

	if (error) {
		console.error('Error fetching invoices:', error);
		toastError('Error al cargar facturas');
		invoicesLoading.set(false);
		return;
	}

	if (data && data.length > 0) {
		const invoiceIds = data.map((i) => i.id);
		const { data: payments, error: paymentsError } = await supabase
			.from('payment_details')
			.select('invoice_id, amount')
			.in('invoice_id', invoiceIds);

		if (paymentsError) {
			console.error('Error fetching payment details for invoices:', paymentsError);
		}

		const paymentMap = new Map<string, number>();
		payments?.forEach((p) => {
			paymentMap.set(p.invoice_id, (paymentMap.get(p.invoice_id) ?? 0) + p.amount);
		});

		const enriched: InvoiceWithClient[] = data.map((inv) => {
			const totalPaid = paymentMap.get(inv.id) ?? 0;
			const grossValue = inv.gross_value ?? 0;
			let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
			if (totalPaid >= grossValue * 0.99) status = 'paid';
			else if (totalPaid > 0) status = 'partial';
			return { ...inv, payment_status: status, total_paid: totalPaid };
		});

		// If paymentStatus filter is set, filter client-side after enrichment
		if (params.paymentStatus && params.paymentStatus !== 'all') {
			const filtered = enriched.filter((inv) => inv.payment_status === params.paymentStatus);
			invoicesList.set(filtered);
		} else {
			invoicesList.set(enriched);
		}
	} else {
		invoicesList.set([]);
	}

	invoicesTotal.set(count ?? 0);
	invoicesLoading.set(false);
}

export async function updateInvoiceField(
	invoiceId: string,
	field: string,
	value: string | null
) {
	const { error } = await supabase
		.from('invoices')
		.update({ [field]: value })
		.eq('id', invoiceId);

	if (error) throw error;
}
