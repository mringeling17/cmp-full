<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
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

	// Default to previous month (most common case: invoicing prior month)
	function defaultPeriod(): string {
		const now = new Date();
		const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
		return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
	}

	let period = $state(defaultPeriod());
	let processing = $state(false);
	let result = $state<{
		created: number;
		updated: number;
		errors: string[];
		outputPath: string;
		totalRows: number;
	} | null>(null);

	async function handleProcess() {
		if (!period || !/^\d{4}-\d{2}$/.test(period)) {
			toast.error('Seleccioná un período válido');
			return;
		}
		const [yearStr, monthStr] = period.split('-');
		const year = parseInt(yearStr, 10);
		const month = parseInt(monthStr, 10);
		if (!year || !month || month < 1 || month > 12) {
			toast.error('Período inválido');
			return;
		}

		processing = true;
		result = null;

		try {
			const response = await fetch('/api/process-excel', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ fileId, month, year })
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
				if (data.totalRows === 0) {
					toast.warning('El archivo no contiene filas válidas para procesar');
				} else if (data.errors?.length > 0) {
					toast.warning(
						`Procesado con errores: ${data.created} creadas, ${data.updated} actualizadas, ${data.errors.length} errores`
					);
				} else {
					toast.success(
						`Procesado: ${data.created} creadas, ${data.updated} actualizadas (${data.totalRows} filas, país: ${data.country})`
					);
				}
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

<div class="flex flex-wrap items-end gap-3">
	<div class="flex flex-col gap-1.5">
		<Label for="process-period" class="text-xs">Período de facturación</Label>
		<Input
			id="process-period"
			type="month"
			bind:value={period}
			disabled={processing}
			class="h-9 w-[180px]"
		/>
	</div>
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
