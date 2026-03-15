<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { toast } from 'svelte-sonner';
	import { Loader2, FileSpreadsheet, Upload } from '@lucide/svelte';
	import type { FileRecord } from '$lib/stores/files';

	let {
		invoiceSummaryFiles,
		onGenerated
	}: {
		invoiceSummaryFiles: FileRecord[];
		onGenerated?: () => void;
	} = $props();

	let selectedFileId = $state<string>('');
	let xubioFile = $state<File | null>(null);
	let processing = $state(false);
	let result = $state<{
		matched: number;
		unmatched: number;
		unmatchedSample: string[];
		outputFilename: string;
	} | null>(null);

	let fileInput: HTMLInputElement;

	const selectedLabel = $derived(
		selectedFileId
			? invoiceSummaryFiles.find((f) => f.id === selectedFileId)?.filename ?? 'Seleccionar'
			: 'Seleccionar Invoice Summary'
	);

	function handleXubioSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files?.[0]) {
			xubioFile = input.files[0];
		}
	}

	async function handleGenerate() {
		if (!selectedFileId || !xubioFile) {
			toast.error('Selecciona el Invoice Summary y sube el archivo Xubio');
			return;
		}

		processing = true;
		result = null;

		try {
			const formData = new FormData();
			formData.append('invoiceSummaryFileId', selectedFileId);
			formData.append('xubioFile', xubioFile);

			const response = await fetch('/api/generate-credit-notes', {
				method: 'POST',
				body: formData
			});

			const data = await response.json();

			if (data.success) {
				result = {
					matched: data.matched,
					unmatched: data.unmatched,
					unmatchedSample: data.unmatchedSample ?? [],
					outputFilename: data.outputFilename
				};
				toast.success(`Notas de crédito generadas: ${data.matched} coincidencias`);
				onGenerated?.();
			} else {
				toast.error(`Error: ${data.error}`);
			}
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			toast.error(`Error al generar: ${message}`);
		} finally {
			processing = false;
		}
	}
</script>

<div class="space-y-4">
	<div class="flex flex-wrap items-end gap-3">
		<!-- Step 1: Select Invoice Summary -->
		<div class="space-y-1.5">
			<label class="text-xs font-medium text-muted-foreground">Invoice Summary procesado</label>
			<Select.Select
				type="single"
				value={selectedFileId}
				onValueChange={(v) => { if (v) selectedFileId = v; }}
			>
				<Select.SelectTrigger class="h-9 w-[300px]">
					{#snippet children()}
						<span class="truncate text-xs">{selectedLabel}</span>
					{/snippet}
				</Select.SelectTrigger>
				<Select.SelectContent>
					{#each invoiceSummaryFiles as f}
						<Select.SelectItem value={f.id}>
							<span class="text-xs">{f.filename}</span>
						</Select.SelectItem>
					{/each}
					{#if invoiceSummaryFiles.length === 0}
						<div class="px-2 py-1.5 text-xs text-muted-foreground">
							No hay Invoice Summary procesados
						</div>
					{/if}
				</Select.SelectContent>
			</Select.Select>
		</div>

		<!-- Step 2: Upload Xubio file -->
		<div class="space-y-1.5">
			<label class="text-xs font-medium text-muted-foreground">Archivo Xubio</label>
			<div class="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					onclick={() => fileInput.click()}
				>
					<Upload class="mr-1.5 h-3.5 w-3.5" />
					{xubioFile ? xubioFile.name : 'Subir archivo Xubio'}
				</Button>
				<input
					bind:this={fileInput}
					type="file"
					accept=".xlsx,.xls"
					class="hidden"
					onchange={handleXubioSelect}
				/>
			</div>
		</div>

		<!-- Step 3: Generate -->
		<Button
			size="sm"
			disabled={processing || !selectedFileId || !xubioFile}
			onclick={handleGenerate}
		>
			{#if processing}
				<Loader2 class="mr-1.5 h-3.5 w-3.5 animate-spin" />
				Generando...
			{:else}
				<FileSpreadsheet class="mr-1.5 h-3.5 w-3.5" />
				Generar Notas de Crédito
			{/if}
		</Button>
	</div>

	<!-- Results -->
	{#if result}
		<div class="flex items-center gap-2">
			<Badge variant="default" class="text-xs">
				{result.matched} coincidencias
			</Badge>
			{#if result.unmatched > 0}
				<Badge variant="secondary" class="text-xs">
					{result.unmatched} sin match
				</Badge>
			{/if}
			<span class="text-xs text-muted-foreground">
				→ {result.outputFilename}
			</span>
		</div>

		{#if result.unmatchedSample.length > 0}
			<div class="rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950">
				<p class="mb-1 text-xs font-medium text-yellow-800 dark:text-yellow-200">
					Facturas sin match en Xubio:
				</p>
				<ul class="space-y-0.5">
					{#each result.unmatchedSample as obs}
						<li class="text-xs text-yellow-700 dark:text-yellow-300">{obs}</li>
					{/each}
					{#if result.unmatched > result.unmatchedSample.length}
						<li class="text-xs text-yellow-600 dark:text-yellow-400">
							...y {result.unmatched - result.unmatchedSample.length} mas
						</li>
					{/if}
				</ul>
			</div>
		{/if}
	{/if}
</div>
