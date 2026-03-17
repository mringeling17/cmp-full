<script lang="ts">
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { ChevronDown, Check, Search } from '@lucide/svelte';

	let {
		label,
		items,
		selected = $bindable([]),
		searchable = false
	}: {
		label: string;
		items: { id: string; name: string }[];
		selected: string[];
		searchable?: boolean;
	} = $props();

	let open = $state(false);
	let searchQuery = $state('');
	let searchInput: HTMLInputElement | undefined = $state();

	const displayText = $derived(
		selected.length === 0 ? label : `${label} (${selected.length})`
	);

	const filteredItems = $derived(
		searchable && searchQuery.trim()
			? items.filter((item) =>
					item.name.toLowerCase().includes(searchQuery.toLowerCase())
				)
			: items
	);

	function toggle(id: string) {
		if (selected.includes(id)) {
			selected = selected.filter((s) => s !== id);
		} else {
			selected = [...selected, id];
		}
	}

	function clearAll() {
		selected = [];
	}

	$effect(() => {
		if (open && searchable) {
			// Focus search input when popover opens
			setTimeout(() => searchInput?.focus(), 50);
		}
		if (!open) {
			searchQuery = '';
		}
	});
</script>

<Popover.Popover bind:open>
	<Popover.PopoverTrigger
		class="inline-flex h-9 min-w-[140px] items-center justify-between gap-1 rounded-md border border-input bg-background px-3 text-sm shadow-xs hover:bg-accent hover:text-accent-foreground cursor-pointer"
	>
		{#snippet children()}
			<span class="truncate text-xs">{displayText}</span>
			<ChevronDown class="h-3 w-3 opacity-50" />
		{/snippet}
	</Popover.PopoverTrigger>
	<Popover.PopoverContent class="w-[220px] p-0" align="start">
		{#if searchable}
			<div class="flex items-center gap-2 border-b px-2 py-1.5">
				<Search class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
				<input
					bind:this={searchInput}
					bind:value={searchQuery}
					placeholder="Buscar..."
					class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
				/>
			</div>
		{/if}
		<div class="max-h-[300px] overflow-y-auto p-1">
			{#if selected.length > 0}
				<button
					class="w-full text-left px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent rounded-sm"
					onclick={clearAll}
				>
					Limpiar seleccion
				</button>
			{/if}
			{#each filteredItems as item (item.id)}
				{@const isSelected = selected.includes(item.id)}
				<button
					class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
					onclick={() => toggle(item.id)}
				>
					<div
						class="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border {isSelected
							? 'bg-primary border-primary text-primary-foreground'
							: 'border-input'}"
					>
						{#if isSelected}
							<Check class="h-3 w-3" />
						{/if}
					</div>
					<span class="truncate">{item.name}</span>
				</button>
			{/each}
			{#if filteredItems.length === 0}
				<p class="px-2 py-4 text-sm text-muted-foreground text-center">Sin opciones</p>
			{/if}
		</div>
	</Popover.PopoverContent>
</Popover.Popover>
