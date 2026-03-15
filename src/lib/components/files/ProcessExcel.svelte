<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { toast } from 'svelte-sonner';
	import { Loader2, Play } from '@lucide/svelte';

	let {
		fileId,
		filename,
		onProcessed
	}: {
		fileId: string;
		filename: string;
		onProcessed?: () => void;
	} = $props();

	let processing = $state(false);
	let result = $state<{
		created: number;
		updated: number;
		errors: string[];
		outputPath: string;
		totalRows: number;
	} | null>(null);

	async function handleProcess() {
		processing = true;
		result = null;

		try {
			const response = await fetch('/api/process-excel', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ fileId })
			});

			const data = await response.json();

			if (data.success) {
				result = {
					created: data.created,
					updated: data.updated,
					errors: data.errors ?? [],
					outputPath: data.outputPath,
					totalRows: data.totalRows
				};
				toast.success(
					`Procesado: ${data.created} creadas, ${data.updated} actualizadas`
				);
				onProcessed?.();
			} else {
				toast.error(`Error: ${data.error}`);
			}
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			toast.error(`Error al procesar: ${message}`);
		} finally {
			processing = false;
		}
	}
</script>

<div class="flex items-center gap-2">
	<Button
		variant="outline"
		size="sm"
		disabled={processing}
		onclick={handleProcess}
	>
		{#if processing}
			<Loader2 class="mr-1.5 h-3.5 w-3.5 animate-spin" />
			Procesando...
		{:else}
			<Play class="mr-1.5 h-3.5 w-3.5" />
			Procesar
		{/if}
	</Button>

	{#if result}
		<div class="flex items-center gap-1.5">
			<Badge variant="secondary" class="text-xs">
				{result.totalRows} filas
			</Badge>
			<Badge variant="default" class="text-xs">
				{result.created} creadas
			</Badge>
			{#if result.updated > 0}
				<Badge variant="outline" class="text-xs">
					{result.updated} actualizadas
				</Badge>
			{/if}
			{#if result.errors.length > 0}
				<Badge variant="destructive" class="text-xs">
					{result.errors.length} errores
				</Badge>
			{/if}
		</div>
	{/if}
</div>

{#if result && result.errors.length > 0}
	<div class="mt-2 rounded-md border border-destructive/20 bg-destructive/5 p-3">
		<p class="mb-1 text-xs font-medium text-destructive">Errores:</p>
		<ul class="space-y-0.5">
			{#each result.errors.slice(0, 5) as error}
				<li class="text-xs text-destructive/80">{error}</li>
			{/each}
			{#if result.errors.length > 5}
				<li class="text-xs text-destructive/60">
					...y {result.errors.length - 5} mas
				</li>
			{/if}
		</ul>
	</div>
{/if}
