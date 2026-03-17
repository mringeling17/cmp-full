<script lang="ts">
	import { selectedCountry, countryConfig } from '$lib/stores/country';
	import {
		fetchInvoices,
		invoicesList,
		invoicesLoading,
		invoicesTotal
	} from '$lib/stores/invoices';
	import type { InvoiceWithClient } from '$lib/stores/invoices';
	import InvoiceGrid from '$lib/components/invoices/InvoiceGrid.svelte';
	import InvoiceFilters from '$lib/components/invoices/InvoiceFilters.svelte';
	import type { InvoiceFilterValues } from '$lib/components/invoices/InvoiceFilters.svelte';
	import CreatePayment from '$lib/components/payments/CreatePayment.svelte';
	import CreateAdjustment from '$lib/components/invoices/CreateAdjustment.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ChevronLeft, ChevronRight, CreditCard } from '@lucide/svelte';

	let { data } = $props();

	// Reactive country value
	let country = $state('ar');
	selectedCountry.subscribe((v) => (country = v));

	// Pagination state
	let currentPage = $state(0);
	const pageSize = 25;

	// Sort state
	let sortField = $state('invoice_date');
	let sortDirection = $state<'asc' | 'desc'>('desc');

	// Filter state
	let currentFilters = $state<InvoiceFilterValues>({
		search: '',
		clientIds: [],
		agencyIds: [],
		channels: [],
		paymentStatus: 'all',
		dateFrom: '',
		dateTo: ''
	});

	// Selected invoices for bulk payment
	let selectedInvoices = $state<InvoiceWithClient[]>([]);

	// Payment dialog state
	let createPaymentOpen = $state(false);

	// Adjustment dialog state
	let adjustmentOpen = $state(false);
	let adjustmentInvoice = $state<InvoiceWithClient | null>(null);

	// Derive filter lists scoped to current country
	const countryClients = $derived(
		(data.clients ?? [])
			.filter((c) => c.country === country)
			.map((c) => ({ id: c.id, name: c.name }))
	);

	const countryAgencies = $derived(
		(data.agencies ?? [])
			.filter((a) => a.country === country)
			.map((a) => ({ id: a.name, name: a.name }))
	);

	const channelOptions = $derived(
		(data.channels ?? []).map((c) => ({ id: c, name: c }))
	);

	// Pagination computations
	const totalPages = $derived(Math.max(1, Math.ceil($invoicesTotal / pageSize)));
	const showingFrom = $derived($invoicesTotal > 0 ? currentPage * pageSize + 1 : 0);
	const showingTo = $derived(
		Math.min((currentPage + 1) * pageSize, $invoicesTotal)
	);

	// Load invoices
	function loadInvoices() {
		fetchInvoices({
			country,
			page: currentPage,
			pageSize,
			search: currentFilters.search || undefined,
			clientIds: currentFilters.clientIds.length > 0 ? currentFilters.clientIds : undefined,
			agencyIds: currentFilters.agencyIds.length > 0 ? currentFilters.agencyIds : undefined,
			channels: currentFilters.channels.length > 0 ? currentFilters.channels : undefined,
			dateFrom: currentFilters.dateFrom || null,
			dateTo: currentFilters.dateTo || null,
			paymentStatus: currentFilters.paymentStatus,
			sortField,
			sortDirection
		});
	}

	// React to country changes
	$effect(() => {
		country;
		currentPage = 0;
		selectedInvoices = [];
		loadInvoices();
	});

	// React to filter, sort, and page changes (excluding country which is handled above)
	let initialized = false;
	$effect(() => {
		// Track dependencies
		currentPage;
		sortField;
		sortDirection;
		currentFilters;
		// Skip first run since country $effect handles it
		if (!initialized) {
			initialized = true;
			return;
		}
		loadInvoices();
	});

	function handleFilterChange(filters: InvoiceFilterValues) {
		currentFilters = filters;
		currentPage = 0;
		selectedInvoices = [];
	}

	function handleSortChanged(field: string, direction: 'asc' | 'desc') {
		sortField = field;
		sortDirection = direction;
		currentPage = 0;
	}

	function handleSelectionChanged(selected: InvoiceWithClient[]) {
		selectedInvoices = selected;
	}

	function handlePreviousPage() {
		if (currentPage > 0) {
			currentPage--;
			selectedInvoices = [];
		}
	}

	function handleNextPage() {
		if (currentPage < totalPages - 1) {
			currentPage++;
			selectedInvoices = [];
		}
	}

	function handleRegistrarPago() {
		createPaymentOpen = true;
	}

	function handlePaymentCreated() {
		selectedInvoices = [];
		loadInvoices();
	}

	function handleAdjust(invoice: InvoiceWithClient) {
		adjustmentInvoice = invoice;
		adjustmentOpen = true;
	}

	function handleAdjustmentCreated() {
		loadInvoices();
	}
</script>

<div class="space-y-4">
	<!-- Header -->
	<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Facturas</h1>
			<p class="text-sm text-muted-foreground">
				Gestion de facturas - {$countryConfig.name}
			</p>
		</div>
	</div>

	<!-- Filters -->
	<InvoiceFilters
		clients={countryClients}
		agencies={countryAgencies}
		{channelOptions}
		onFilterChange={handleFilterChange}
	/>

	<!-- Grid -->
	<InvoiceGrid
		invoices={$invoicesList}
		loading={$invoicesLoading}
		onSelectionChanged={handleSelectionChanged}
		onSortChanged={handleSortChanged}
		onAdjust={handleAdjust}
	/>

	<!-- Pagination -->
	<div class="flex items-center justify-between border-t pt-4">
		<p class="text-sm text-muted-foreground">
			{#if $invoicesTotal > 0}
				Mostrando {showingFrom} a {showingTo} de {$invoicesTotal} facturas
			{:else}
				Sin resultados
			{/if}
		</p>
		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				disabled={currentPage === 0}
				onclick={handlePreviousPage}
			>
				<ChevronLeft class="h-4 w-4" />
				Anterior
			</Button>
			<span class="text-sm text-muted-foreground">
				Pagina {currentPage + 1} de {totalPages}
			</span>
			<Button
				variant="outline"
				size="sm"
				disabled={currentPage >= totalPages - 1}
				onclick={handleNextPage}
			>
				Siguiente
				<ChevronRight class="h-4 w-4" />
			</Button>
		</div>
	</div>
</div>

<!-- Selection bar -->
{#if selectedInvoices.length > 0}
	<div
		class="fixed bottom-0 left-0 right-0 z-50 border-t bg-primary p-4 text-primary-foreground shadow-lg"
	>
		<div class="mx-auto flex max-w-7xl items-center justify-between">
			<span class="text-sm font-medium">
				{selectedInvoices.length} factura{selectedInvoices.length !== 1 ? 's' : ''} seleccionada{selectedInvoices.length !== 1 ? 's' : ''}
			</span>
			<Button variant="secondary" size="sm" onclick={handleRegistrarPago}>
				<CreditCard class="mr-2 h-4 w-4" />
				Registrar Pago
			</Button>
		</div>
	</div>
{/if}

<!-- Create Payment Dialog -->
<CreatePayment
	bind:open={createPaymentOpen}
	preselectedInvoices={selectedInvoices}
	{country}
	onCreated={handlePaymentCreated}
	onClose={() => (createPaymentOpen = false)}
/>

<!-- Create Adjustment Dialog -->
<CreateAdjustment
	bind:open={adjustmentOpen}
	invoice={adjustmentInvoice}
	{country}
	onCreated={handleAdjustmentCreated}
/>
