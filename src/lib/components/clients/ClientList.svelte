<script lang="ts">
	import { clientsList, clientsLoading } from '$lib/stores/clients';
	import type { ClientWithEmails } from '$lib/stores/clients';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Plus, Search, Mail, Loader2 } from '@lucide/svelte';

	let {
		selectedId = $bindable<string | null>(null),
		onCreateClick
	}: {
		selectedId?: string | null;
		onCreateClick: () => void;
	} = $props();

	let search = $state('');

	const filtered = $derived(
		$clientsList.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
	);

	function selectClient(client: ClientWithEmails) {
		selectedId = client.id;
	}
</script>

<div class="flex h-full flex-col">
	<div class="flex items-center gap-2 border-b p-3">
		<div class="relative flex-1">
			<Search class="text-muted-foreground absolute left-2.5 top-2.5 size-4" />
			<Input placeholder="Buscar cliente..." class="pl-8" bind:value={search} />
		</div>
		<Button size="sm" onclick={onCreateClick}>
			<Plus class="mr-1 size-4" />
			Nuevo
		</Button>
	</div>

	<div class="flex-1 overflow-y-auto">
		{#if $clientsLoading}
			<div class="flex items-center justify-center p-8">
				<Loader2 class="text-muted-foreground size-6 animate-spin" />
			</div>
		{:else if filtered.length === 0}
			<div class="text-muted-foreground p-4 text-center text-sm">
				{search ? 'No se encontraron clientes' : 'No hay clientes'}
			</div>
		{:else}
			{#each filtered as client (client.id)}
				<button
					class="flex w-full items-center justify-between border-b px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent {selectedId ===
					client.id
						? 'bg-accent'
						: ''}"
					onclick={() => selectClient(client)}
				>
					<span class="truncate font-medium">{client.name}</span>
					{#if client.emails.length > 0}
						<Badge variant="secondary" class="ml-2 shrink-0">
							<Mail class="mr-1 size-3" />
							{client.emails.length}
						</Badge>
					{/if}
				</button>
			{/each}
		{/if}
	</div>
</div>
