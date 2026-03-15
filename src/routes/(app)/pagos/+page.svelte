<script lang="ts">
	import { selectedCountry, countryConfig } from '$lib/stores/country';
	import {
		fetchPayments,
		paymentsList,
		paymentsLoading,
		paymentsTotal
	} from '$lib/stores/payments';
	import type { PaymentWithDetails } from '$lib/stores/payments';
	import PaymentGrid from '$lib/components/payments/PaymentGrid.svelte';
	import ViewPayment from '$lib/components/payments/ViewPayment.svelte';
	import CreatePayment from '$lib/components/payments/CreatePayment.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Plus, Search, RotateCcw } from '@lucide/svelte';

	// Reactive country
	let country = $state('ar');
	selectedCountry.subscribe((v) => (country = v));

	// Filter state
	let search = $state('');
	let dateFrom = $state('');
	let dateTo = $state('');
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;

	// Dialog state
	let createPaymentOpen = $state(false);
	let viewPaymentOpen = $state(false);
	let selectedPayment = $state<PaymentWithDetails | null>(null);

	function loadPayments() {
		fetchPayments({
			country,
			dateFrom: dateFrom || null,
			dateTo: dateTo || null,
			search: search || undefined
		});
	}

	// React to country changes
	$effect(() => {
		country;
		search = '';
		dateFrom = '';
		dateTo = '';
		loadPayments();
	});

	// React to filter changes (debounced search)
	let initialized = false;
	$effect(() => {
		dateFrom;
		dateTo;
		if (!initialized) {
			initialized = true;
			return;
		}
		loadPayments();
	});

	function handleSearchInput(e: Event) {
		const target = e.target as HTMLInputElement;
		search = target.value;
		if (searchTimeout) clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			loadPayments();
		}, 300);
	}

	function handleRowClicked(payment: PaymentWithDetails) {
		selectedPayment = payment;
		viewPaymentOpen = true;
	}

	function handlePaymentCreated() {
		loadPayments();
	}

	function handleReset() {
		search = '';
		dateFrom = '';
		dateTo = '';
		loadPayments();
	}

	const hasActiveFilters = $derived(
		search !== '' || dateFrom !== '' || dateTo !== ''
	);
</script>

<div class="space-y-4">
	<!-- Header -->
	<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Pagos</h1>
			<p class="text-sm text-muted-foreground">
				Gestion de pagos - {$countryConfig.name}
			</p>
		</div>
		<Button onclick={() => (createPaymentOpen = true)}>
			<Plus class="mr-2 h-4 w-4" />
			Nuevo Pago
		</Button>
	</div>

	<!-- Filters -->
	<div class="flex flex-wrap items-center gap-2">
		<!-- Search -->
		<div class="relative">
			<Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
			<Input
				type="text"
				placeholder="Buscar por referencia..."
				value={search}
				oninput={handleSearchInput}
				class="h-9 w-[220px] pl-8 text-xs"
			/>
		</div>

		<!-- Date From -->
		<div class="flex items-center gap-1.5">
			<label for="pay-date-from" class="text-xs text-muted-foreground whitespace-nowrap">Desde</label>
			<Input
				id="pay-date-from"
				type="date"
				bind:value={dateFrom}
				class="h-9 w-[140px] text-xs"
			/>
		</div>

		<!-- Date To -->
		<div class="flex items-center gap-1.5">
			<label for="pay-date-to" class="text-xs text-muted-foreground whitespace-nowrap">Hasta</label>
			<Input
				id="pay-date-to"
				type="date"
				bind:value={dateTo}
				class="h-9 w-[140px] text-xs"
			/>
		</div>

		<!-- Reset -->
		{#if hasActiveFilters}
			<Button variant="ghost" size="sm" onclick={handleReset} class="h-9 gap-1">
				<RotateCcw class="h-3.5 w-3.5" />
				<span class="text-xs">Limpiar</span>
			</Button>
		{/if}
	</div>

	<!-- Grid -->
	<PaymentGrid
		payments={$paymentsList}
		loading={$paymentsLoading}
		onRowClicked={handleRowClicked}
	/>

	<!-- Info -->
	<div class="border-t pt-4">
		<p class="text-sm text-muted-foreground">
			{#if $paymentsTotal > 0}
				{$paymentsTotal} pago{$paymentsTotal !== 1 ? 's' : ''} encontrado{$paymentsTotal !== 1 ? 's' : ''}
			{:else}
				Sin resultados
			{/if}
		</p>
	</div>
</div>

<!-- View Payment Dialog -->
<ViewPayment bind:open={viewPaymentOpen} payment={selectedPayment} />

<!-- Create Payment Dialog -->
<CreatePayment
	bind:open={createPaymentOpen}
	{country}
	onCreated={handlePaymentCreated}
/>
