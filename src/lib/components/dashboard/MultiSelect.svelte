<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { ChevronDown, Check } from '@lucide/svelte';

	let {
		label,
		items,
		selected = $bindable([])
	}: {
		label: string;
		items: { id: string; name: string }[];
		selected: string[];
	} = $props();

	let open = $state(false);

	const displayText = $derived(
		selected.length === 0 ? label : `${label} (${selected.length})`
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
</script>

<Popover.Popover bind:open>
	<Popover.PopoverTrigger>
		{#snippet children()}
			<Button variant="outline" size="sm" class="h-9 justify-between gap-1 min-w-[140px]">
				<span class="truncate text-xs">{displayText}</span>
				<ChevronDown class="h-3 w-3 opacity-50" />
			</Button>
		{/snippet}
	</Popover.PopoverTrigger>
	<Popover.PopoverContent class="w-[220px] p-0" align="start">
		<div class="max-h-[300px] overflow-y-auto p-1">
			{#if selected.length > 0}
				<button
					class="w-full text-left px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent rounded-sm"
					onclick={clearAll}
				>
					Limpiar seleccion
				</button>
			{/if}
			{#each items as item (item.id)}
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
			{#if items.length === 0}
				<p class="px-2 py-4 text-sm text-muted-foreground text-center">Sin opciones</p>
			{/if}
		</div>
	</Popover.PopoverContent>
</Popover.Popover>
