<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import MultiSelect from './MultiSelect.svelte';
	import MonthPicker from './MonthPicker.svelte';
	import { filters, resetFilters, type FilterState } from '$lib/stores/filters';
	import { RotateCcw } from '@lucide/svelte';

	let {
		clients,
		agencies,
		channels
	}: {
		clients: { id: string; name: string }[];
		agencies: { id: string; name: string }[];
		channels: { id: string; name: string }[];
	} = $props();

	// Default: last 6 months from current month
	function getDefaultMonths() {
		const now = new Date();
		const toYear = now.getFullYear();
		const toMonth = now.getMonth() + 1;
		let fromMonth = toMonth - 5;
		let fromYear = toYear;
		if (fromMonth <= 0) {
			fromMonth += 12;
			fromYear -= 1;
		}
		return {
			from: `${fromYear}-${String(fromMonth).padStart(2, '0')}`,
			to: `${toYear}-${String(toMonth).padStart(2, '0')}`
		};
	}

	const defaults = getDefaultMonths();
	let monthFrom = $state<string>(defaults.from);
	let monthTo = $state<string>(defaults.to);
	let selectedClients = $state<string[]>([]);
	let selectedAgencies = $state<string[]>([]);
	let selectedChannels = $state<string[]>([]);

	function monthToDateFrom(month: string): string | null {
		if (!month) return null;
		return `${month}-01`;
	}

	function monthToDateTo(month: string): string | null {
		if (!month) return null;
		const [y, m] = month.split('-').map(Number);
		const lastDay = new Date(y, m, 0).getDate();
		return `${month}-${String(lastDay).padStart(2, '0')}`;
	}

	// Sync local state to store
	$effect(() => {
		const update: FilterState = {
			dateFrom: monthToDateFrom(monthFrom),
			dateTo: monthToDateTo(monthTo),
			clientIds: selectedClients,
			agencyIds: selectedAgencies,
			channels: selectedChannels
		};
		filters.set(update);
	});

	function handleReset() {
		const d = getDefaultMonths();
		monthFrom = d.from;
		monthTo = d.to;
		selectedClients = [];
		selectedAgencies = [];
		selectedChannels = [];
	}

	const hasActiveFilters = $derived(
		monthFrom !== defaults.from ||
			monthTo !== defaults.to ||
			selectedClients.length > 0 ||
			selectedAgencies.length > 0 ||
			selectedChannels.length > 0
	);
</script>

<div class="flex flex-wrap items-center gap-2">
	<div class="flex items-center gap-1.5">
		<label class="text-xs text-muted-foreground whitespace-nowrap">Desde</label>
		<MonthPicker bind:value={monthFrom} />
	</div>
	<div class="flex items-center gap-1.5">
		<label class="text-xs text-muted-foreground whitespace-nowrap">Hasta</label>
		<MonthPicker bind:value={monthTo} />
	</div>

	<MultiSelect label="Clientes" items={clients} bind:selected={selectedClients} searchable={true} />
	<MultiSelect label="Agencias" items={agencies} bind:selected={selectedAgencies} searchable={true} />
	<MultiSelect label="Canales" items={channels} bind:selected={selectedChannels} />

	{#if hasActiveFilters}
		<Button variant="ghost" size="sm" onclick={handleReset} class="h-9 gap-1">
			<RotateCcw class="h-3.5 w-3.5" />
			<span class="text-xs">Limpiar</span>
		</Button>
	{/if}
</div>
