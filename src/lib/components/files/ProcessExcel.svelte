<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { toast } from 'svelte-sonner';
	import { Loader2, Play, AlertTriangle, CheckCircle2 } from '@lucide/svelte';
	import { getSpanishMonthName } from '$lib/config/locale';

	let {
		fileId,
		filename,
		onProcessed
	}: {
		fileId: string;
		filename: string;
		onProcessed?: () => void;
	} = $props();

	// Period is pre-filled from the file itself (Excel header / filename) so the
	// user confirms the file's REAL period instead of a blind "previous month"
	// default that silently overrode the file (caused July→April mis-loads).
	let period = $state('');
	let detecting = $state(true);
	let detectMsg = $state('');
	let detectWarn = $state(false);
	let processing = $state(false);

	function fmtPeriod(y: number, m: number): string {
		return `${getSpanishMonthName(m)} ${y}`;
	}

	async function detectPeriod() {
		detecting = true;
		detectMsg = '';
		try {
			const res = await fetch('/api/detect-period', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ fileId })
			});
			const d = await res.json();
			if (d.success && (d.periodSource === 'filename' || d.periodSource === 'header')) {
				period = `${d.year}-${String(d.month).padStart(2, '0')}`;
				if (d.periodSource === 'filename') {
					detectMsg = `Período detectado del nombre del archivo: ${fmtPeriod(d.year, d.month)}. Confirmá o corregí antes de procesar.`;
				} else {
					detectMsg = `Período detectado del encabezado del Excel: ${fmtPeriod(d.year, d.month)}. El nombre del archivo no indica el mes — confirmá o corregí.`;
				}
				detectWarn = false;
			} else {
				// Could not detect from filename or header → force the user to pick.
				period = '';
				detectMsg =
					'⚠ No se pudo detectar el período (el archivo no tiene el mes en el nombre ni en el encabezado). Elegí mes y año manualmente antes de procesar.';
				detectWarn = true;
			}
		} catch {
			period = '';
			detectMsg =
				'⚠ No se pudo detectar el período. Elegí mes y año manualmente antes de procesar.';
			detectWarn = true;
		} finally {
			detecting = false;
		}
	}

	let detectedFor = '';
	$effect(() => {
		if (fileId && detectedFor !== fileId) {
			detectedFor = fileId;
			detectPeriod();
		}
	});
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
			disabled={processing || detecting}
			class="h-9 w-[180px]"
		/>
	</div>
	<Button
		variant="outline"
		size="sm"
		disabled={processing || detecting || !period}
		onclick={handleProcess}
	>
		{#if detecting}
			<Loader2 class="mr-1.5 h-3.5 w-3.5 animate-spin" />
			Detectando período...
		{:else if processing}
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

{#if detectMsg}
	<div
		class="mt-2 flex items-start gap-2 rounded-md border p-2.5 text-xs {detectWarn
			? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200'
			: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'}"
	>
		{#if detectWarn}
			<AlertTriangle class="mt-0.5 h-3.5 w-3.5 shrink-0" />
		{:else}
			<CheckCircle2 class="mt-0.5 h-3.5 w-3.5 shrink-0" />
		{/if}
		<span>{detectMsg}</span>
	</div>
{/if}

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
