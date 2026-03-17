<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import MultiSelect from './MultiSelect.svelte';
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

	let dateFrom = $state<string>('');
	let dateTo = $state<string>('');
	let selectedClients = $state<string[]>([]);
	let selectedAgencies = $state<string[]>([]);
	let selectedChannels = $state<string[]>([]);

	// Sync local state to store
	$effect(() => {
		const update: FilterState = {
			dateFrom: dateFrom || null,
			dateTo: dateTo || null,
			clientIds: selectedClients,
			agencyIds: selectedAgencies,
			channels: selectedChannels
		};
		filters.set(update);
	});

	function handleReset() {
		dateFrom = '';
		dateTo = '';
		selectedClients = [];
		selectedAgencies = [];
		selectedChannels = [];
		resetFilters();
	}

	const hasActiveFilters = $derived(
		dateFrom !== '' ||
			dateTo !== '' ||
			selectedClients.length > 0 ||
			selectedAgencies.length > 0 ||
			selectedChannels.length > 0
	);
</script>

<div class="flex flex-wrap items-center gap-2">
	<div class="flex items-center gap-1.5">
		<label for="date-from" class="text-xs text-muted-foreground whitespace-nowrap">Desde</label>
		<Input id="date-from" type="date" bind:value={dateFrom} class="h-9 w-[140px] text-xs" />
	</div>
	<div class="flex items-center gap-1.5">
		<label for="date-to" class="text-xs text-muted-foreground whitespace-nowrap">Hasta</label>
		<Input id="date-to" type="date" bind:value={dateTo} class="h-9 w-[140px] text-xs" />
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
