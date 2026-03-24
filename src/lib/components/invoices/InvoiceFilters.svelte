<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import MultiSelect from '$lib/components/dashboard/MultiSelect.svelte';
	import MonthPicker from '$lib/components/dashboard/MonthPicker.svelte';
	import { RotateCcw, Search } from '@lucide/svelte';

	export interface InvoiceFilterValues {
		search: string;
		clientIds: string[];
		agencyIds: string[];
		channels: string[];
		paymentStatus: string;
		dateFrom: string;
		dateTo: string;
	}

	let {
		clients,
		agencies,
		channelOptions,
		onFilterChange
	}: {
		clients: { id: string; name: string }[];
		agencies: { id: string; name: string }[];
		channelOptions: { id: string; name: string }[];
		onFilterChange: (filters: InvoiceFilterValues) => void;
	} = $props();

	let search = $state('');
	let selectedClients = $state<string[]>([]);
	let selectedAgencies = $state<string[]>([]);
	let selectedChannels = $state<string[]>([]);
	let paymentStatus = $state<string>('all');
	let dateFrom = $state('');
	let dateTo = $state('');

	let searchTimeout: ReturnType<typeof setTimeout> | null = null;

	function monthToDateFrom(month: string): string {
		if (!month) return '';
		return `${month}-01`;
	}

	function monthToDateTo(month: string): string {
		if (!month) return '';
		const [y, m] = month.split('-').map(Number);
		const lastDay = new Date(y, m, 0).getDate();
		return `${month}-${String(lastDay).padStart(2, '0')}`;
	}

	function emitFilterChange() {
		onFilterChange({
			search,
			clientIds: selectedClients,
			agencyIds: selectedAgencies,
			channels: selectedChannels,
			paymentStatus,
			dateFrom: monthToDateFrom(dateFrom),
			dateTo: monthToDateTo(dateTo)
		});
	}

	function handleSearchInput(e: Event) {
		const target = e.target as HTMLInputElement;
		search = target.value;
		if (searchTimeout) clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			emitFilterChange();
		}, 300);
	}

	// React to filter changes (non-search)
	$effect(() => {
		// Track all reactive values
		selectedClients;
		selectedAgencies;
		selectedChannels;
		paymentStatus;
		dateFrom;
		dateTo;
		emitFilterChange();
	});

	function handleReset() {
		search = '';
		selectedClients = [];
		selectedAgencies = [];
		selectedChannels = [];
		paymentStatus = 'all';
		dateFrom = '';
		dateTo = '';
		emitFilterChange();
	}

	const hasActiveFilters = $derived(
		search !== '' ||
			selectedClients.length > 0 ||
			selectedAgencies.length > 0 ||
			selectedChannels.length > 0 ||
			paymentStatus !== 'all' ||
			dateFrom !== '' ||
			dateTo !== ''
	);

	const statusLabel = $derived(
		paymentStatus === 'all'
			? 'Estado'
			: paymentStatus === 'paid'
				? 'Pagado'
				: paymentStatus === 'partial'
					? 'Parcial'
					: 'Pendiente'
	);
</script>

<div class="flex flex-wrap items-center gap-2">
	<!-- Search -->
	<div class="relative">
		<Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
		<Input
			type="text"
			placeholder="Buscar factura..."
			value={search}
			oninput={handleSearchInput}
			class="h-9 w-[200px] pl-8 text-xs"
		/>
	</div>

	<!-- Date From -->
	<div class="flex items-center gap-1.5">
		<label class="text-xs text-muted-foreground whitespace-nowrap">Desde</label>
		<MonthPicker bind:value={dateFrom} />
	</div>

	<!-- Date To -->
	<div class="flex items-center gap-1.5">
		<label class="text-xs text-muted-foreground whitespace-nowrap">Hasta</label>
		<MonthPicker bind:value={dateTo} />
	</div>

	<!-- Multi-selects -->
	<MultiSelect label="Clientes" items={clients} bind:selected={selectedClients} />
	<MultiSelect label="Agencias" items={agencies} bind:selected={selectedAgencies} />
	<MultiSelect label="Canales" items={channelOptions} bind:selected={selectedChannels} />

	<!-- Payment Status -->
	<Select.Select
		type="single"
		value={paymentStatus}
		onValueChange={(v) => {
			if (v) paymentStatus = v;
		}}
	>
		<Select.SelectTrigger size="sm" class="h-9 w-[130px]">
			{#snippet children()}
				<span class="text-xs">{statusLabel}</span>
			{/snippet}
		</Select.SelectTrigger>
		<Select.SelectContent>
			<Select.SelectItem value="all">Todos</Select.SelectItem>
			<Select.SelectItem value="paid">Pagado</Select.SelectItem>
			<Select.SelectItem value="partial">Parcial</Select.SelectItem>
			<Select.SelectItem value="unpaid">Pendiente</Select.SelectItem>
		</Select.SelectContent>
	</Select.Select>

	<!-- Reset -->
	{#if hasActiveFilters}
		<Button variant="ghost" size="sm" onclick={handleReset} class="h-9 gap-1">
			<RotateCcw class="h-3.5 w-3.5" />
			<span class="text-xs">Limpiar</span>
		</Button>
	{/if}
</div>
