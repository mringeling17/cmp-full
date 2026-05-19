<script lang="ts">
	import { browser } from '$app/environment';
	import { SPANISH_MONTHS } from '$lib/config/locale';
	import AgGridSvelte from 'ag-grid-svelte5';
	import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
	import type { ColDef, GridOptions } from '@ag-grid-community/core';
	import { mode } from 'mode-watcher';
	import { selectedCountry } from '$lib/stores/country';
	import { formatCurrency, formatNumber } from '$lib/utils/currency';
	import {
		generateReportData,
		getColumnHeaders,
		computeReportTotals,
		type ReportConfig,
		type ReportRow
	} from '$lib/utils/report-engine';
	import { exportReportToExcel } from '$lib/utils/excel-export';
	import { getTaxMultiplier } from '$lib/utils/tax';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import MultiSelect from '$lib/components/dashboard/MultiSelect.svelte';
	import { Download, Save, Trash2 } from '@lucide/svelte';

	let { data } = $props();

	// ── Country ──
	let country = $state('ar');
	selectedCountry.subscribe((v) => (country = v));

	// ── Report type selector ──
	let reportType = $state<'facturacion' | 'cobrado' | 'pendiente'>('facturacion');

	// ── Form state ──
	let rowGroup = $state<'client' | 'agency' | 'channel'>('client');
	let columnBreakdown = $state<'none' | 'months' | 'quarters'>('none');
	let metric = $state<'net_value' | 'gross_value' | 'spot_count'>('net_value');

	const currentYear = new Date().getFullYear();
	let filterYear = $state(currentYear);
	let filterMonthFrom = $state(0);
	let filterMonthTo = $state(0);
	let filterClientIds = $state<string[]>([]);
	let filterAgencyIds = $state<string[]>([]);
	let filterChannels = $state<string[]>([]);

	// ── Report #5: Cobrado por mes ──
	const defaultMonthFrom = (() => {
		const d = new Date();
		d.setMonth(d.getMonth() - 2);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
	})();
	const defaultMonthTo = (() => {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
	})();
	let cobradoMonthFrom = $state(defaultMonthFrom);
	let cobradoMonthTo = $state(defaultMonthTo);
	let cobradoFilterClientIds = $state<string[]>([]);
	let cobradoFilterAgencyIds = $state<string[]>([]);

	// ── Report #6: Pendiente por agencia/cliente ──
	let pendienteGroup = $state<'agency' | 'client'>('client');

	// ── Preset state ──
	let presetName = $state('');

	interface SavedPreset {
		name: string;
		config: {
			rows: 'client' | 'agency' | 'channel';
			columns: 'none' | 'months' | 'quarters';
			metric: 'net_value' | 'gross_value' | 'spot_count';
			year: number;
			monthFrom: number;
			monthTo: number;
			clientIds: string[];
			agencyIds: string[];
			channels: string[];
		};
	}

	let customPresets = $state<SavedPreset[]>(loadPresets());

	function loadPresets(): SavedPreset[] {
		if (!browser) return [];
		try {
			const raw = localStorage.getItem('cmp-report-presets');
			return raw ? JSON.parse(raw) : [];
		} catch {
			return [];
		}
	}

	function savePresets() {
		if (!browser) return;
		localStorage.setItem('cmp-report-presets', JSON.stringify(customPresets));
	}

	function saveCurrentPreset() {
		if (!presetName.trim()) return;
		const preset: SavedPreset = {
			name: presetName.trim(),
			config: {
				rows: rowGroup,
				columns: columnBreakdown,
				metric,
				year: filterYear,
				monthFrom: filterMonthFrom,
				monthTo: filterMonthTo,
				clientIds: [...filterClientIds],
				agencyIds: [...filterAgencyIds],
				channels: [...filterChannels]
			}
		};
		customPresets = [...customPresets, preset];
		savePresets();
		presetName = '';
	}

	function deletePreset(index: number) {
		customPresets = customPresets.filter((_, i) => i !== index);
		savePresets();
	}

	function applyPresetConfig(config: SavedPreset['config']) {
		rowGroup = config.rows;
		columnBreakdown = config.columns;
		metric = config.metric;
		filterYear = config.year;
		filterMonthFrom = config.monthFrom;
		filterMonthTo = config.monthTo;
		filterClientIds = [...config.clientIds];
		filterAgencyIds = [...config.agencyIds];
		filterChannels = [...config.channels];
	}

	// ── Built-in presets ──
	const builtInPresets: { label: string; config: SavedPreset['config'] }[] = [
		{
			label: 'Ventas por Canal',
			config: {
				rows: 'channel',
				columns: 'none',
				metric: 'net_value',
				year: currentYear,
				monthFrom: 0,
				monthTo: 0,
				clientIds: [],
				agencyIds: [],
				channels: []
			}
		},
		{
			label: 'Ventas por Agencia',
			config: {
				rows: 'agency',
				columns: 'none',
				metric: 'net_value',
				year: currentYear,
				monthFrom: 0,
				monthTo: 0,
				clientIds: [],
				agencyIds: [],
				channels: []
			}
		},
		{
			label: 'Matriz Cliente x Mes',
			config: {
				rows: 'client',
				columns: 'months',
				metric: 'net_value',
				year: currentYear,
				monthFrom: 0,
				monthTo: 0,
				clientIds: [],
				agencyIds: [],
				channels: []
			}
		},
		{
			label: 'Matriz Canal x Mes',
			config: {
				rows: 'channel',
				columns: 'months',
				metric: 'net_value',
				year: currentYear,
				monthFrom: 0,
				monthTo: 0,
				clientIds: [],
				agencyIds: [],
				channels: []
			}
		},
		{
			label: 'Matriz Agencia x Mes',
			config: {
				rows: 'agency',
				columns: 'months',
				metric: 'net_value',
				year: currentYear,
				monthFrom: 0,
				monthTo: 0,
				clientIds: [],
				agencyIds: [],
				channels: []
			}
		}
	];

	// ── Derived filter option lists ──
	const countryClients = $derived(
		(data.clients ?? [])
			.filter((c: any) => c.country === country)
			.map((c: any) => ({ id: c.id, name: c.name }))
	);

	const countryAgencies = $derived(
		(data.agencies ?? [])
			.filter((a: any) => a.country === country)
			.map((a: any) => ({ id: a.id, name: a.name }))
	);

	const channelList = $derived.by(() => {
		const channels = new Set<string>();
		for (const inv of data.invoices ?? []) {
			if ((inv as any).country === country && (inv as any).channel) {
				channels.add((inv as any).channel);
			}
		}
		return Array.from(channels)
			.sort()
			.map((c) => ({ id: c, name: c }));
	});

	const yearOptions = $derived.by(() => {
		const years: number[] = [];
		for (let y = currentYear; y >= currentYear - 5; y--) {
			years.push(y);
		}
		return years;
	});

	const monthOptions = [
		{ value: 0, label: 'Todos' },
		...Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: SPANISH_MONTHS[i + 1] }))
	];

	// ── Report config (derived) ──
	const reportConfig = $derived<ReportConfig>({
		rows: rowGroup,
		columns: columnBreakdown,
		metric,
		filters: {
			year: filterYear,
			monthFrom: filterMonthFrom || undefined,
			monthTo: filterMonthTo || undefined,
			clientIds: filterClientIds.length > 0 ? filterClientIds : undefined,
			agencyIds: filterAgencyIds.length > 0 ? filterAgencyIds : undefined,
			channels: filterChannels.length > 0 ? filterChannels : undefined
		}
	});

	// ── Build maps needed by report engine ──
	const clientsMap = $derived.by(() => {
		const map = new Map<string, string>();
		for (const c of data.clients ?? []) {
			map.set((c as any).id, (c as any).name);
		}
		return map;
	});

	const agencyIdsToNames = $derived.by(() => {
		const map = new Map<string, string>();
		for (const a of data.agencies ?? []) {
			map.set((a as any).id, (a as any).name);
		}
		return map;
	});

	// ── Country-scoped invoices ──
	const countryInvoices = $derived(
		(data.invoices ?? []).filter((inv: any) => inv.country === country)
	);

	// ── Country-scoped payments (for reports #5 and #6) ──
	const countryPayments = $derived(
		(data.payments ?? []).filter((p: any) => p.country === country)
	);

	const countryPaymentIds = $derived(new Set(countryPayments.map((p: any) => p.id as string)));

	// Payment details whose payment belongs to the current country
	const countryPaymentDetails = $derived(
		(data.paymentDetails ?? []).filter((d: any) => countryPaymentIds.has(d.payment_id))
	);

	// ── Report #5: Cobrado por mes ──
	interface CobradoRow extends Record<string, string | number> {
		mes: string;
		total: number;
	}

	const cobradoRows = $derived.by((): CobradoRow[] => {
		// Build set of payment_ids in range
		const paymentIdToMonth = new Map<string, string>();
		for (const p of countryPayments) {
			const cm: string = (p as any).collection_month ?? '';
			if (!cm) continue;
			if (cobradoMonthFrom && cm < cobradoMonthFrom) continue;
			if (cobradoMonthTo && cm > cobradoMonthTo) continue;
			paymentIdToMonth.set((p as any).id, cm);
		}

		const monthTotals = new Map<string, number>();
		for (const detail of countryPaymentDetails) {
			const paymentId: string = (detail as any).payment_id;
			const month = paymentIdToMonth.get(paymentId);
			if (!month) continue;

			// Apply agency/client filters if set
			const inv = (detail as any).invoices;
			if (cobradoFilterClientIds.length > 0) {
				const clientId: string = inv?.client_id ?? '';
				if (!cobradoFilterClientIds.includes(clientId)) continue;
			}
			if (cobradoFilterAgencyIds.length > 0) {
				const agencyId: string = inv?.agency_id ?? '';
				if (!cobradoFilterAgencyIds.includes(agencyId)) continue;
			}

			const amount: number = (detail as any).amount ?? 0;
			monthTotals.set(month, (monthTotals.get(month) ?? 0) + amount);
		}

		return Array.from(monthTotals.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([mes, total]) => ({ mes, total }));
	});

	const cobradoTotal = $derived(cobradoRows.reduce((s, r) => s + r.total, 0));

	// ── Report #6: Pendiente por agencia/cliente ──
	interface PendienteRow extends Record<string, string | number> {
		grupo: string;
		facturado: number;
		cobrado: number;
		pendiente: number;
	}

	const pendienteRows = $derived.by((): PendienteRow[] => {
		const taxMult = getTaxMultiplier(country);

		// facturado con IVA per group key
		const facturadoMap = new Map<string, { nombre: string; valor: number }>();
		for (const inv of countryInvoices) {
			const key =
				pendienteGroup === 'agency'
					? ((inv as any).agency_id as string | null) ?? 'sin-agencia'
					: ((inv as any).client_id as string | null) ?? 'sin-cliente';
			let nombre: string;
			if (pendienteGroup === 'agency') {
				nombre =
					agencyIdsToNames.get(key) ??
					((inv as any).agency as string | null) ??
					'Sin agencia';
			} else {
				nombre = clientsMap.get(key) ?? 'Sin cliente';
			}
			const net: number = (inv as any).net_value ?? 0;
			const existing = facturadoMap.get(key);
			if (existing) {
				existing.valor += net * taxMult;
			} else {
				facturadoMap.set(key, { nombre, valor: net * taxMult });
			}
		}

		// cobrado per group key from payment details
		const cobradoMap = new Map<string, number>();
		for (const detail of countryPaymentDetails) {
			const inv = (detail as any).invoices;
			if (!inv) continue;
			const key =
				pendienteGroup === 'agency'
					? ((inv.agency_id as string | null) ?? 'sin-agencia')
					: ((inv.client_id as string | null) ?? 'sin-cliente');
			const amount: number = (detail as any).amount ?? 0;
			cobradoMap.set(key, (cobradoMap.get(key) ?? 0) + amount);
		}

		// Merge
		const rows: PendienteRow[] = [];
		for (const [key, { nombre, valor: facturado }] of facturadoMap.entries()) {
			const cobrado = cobradoMap.get(key) ?? 0;
			rows.push({ grupo: nombre, facturado, cobrado, pendiente: facturado - cobrado });
		}

		return rows.sort((a, b) => b.pendiente - a.pendiente);
	});

	const pendienteTotals = $derived({
		facturado: pendienteRows.reduce((s, r) => s + r.facturado, 0),
		cobrado: pendienteRows.reduce((s, r) => s + r.cobrado, 0),
		pendiente: pendienteRows.reduce((s, r) => s + r.pendiente, 0)
	});

	// ── Generate report ──
	const reportRows = $derived(
		generateReportData(countryInvoices, reportConfig, clientsMap, agencyIdsToNames)
	);

	const columnHeaders = $derived(getColumnHeaders(reportConfig));

	const reportTotals = $derived(computeReportTotals(reportRows, columnHeaders));

	// ── Dimension label ──
	const dimensionLabel = $derived(
		rowGroup === 'client' ? 'Cliente' : rowGroup === 'agency' ? 'Agencia' : 'Canal'
	);

	// ── Format value based on metric ──
	function fmtValue(value: number): string {
		if (metric === 'spot_count') {
			return formatNumber(value, 0);
		}
		return formatCurrency(value, country);
	}

	// ── AG Grid ──
	let gridClass = $derived(mode.current === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz');

	type FlatRow = Record<string, string | number>;

	const gridRowData = $derived.by((): FlatRow[] => {
		return reportRows.map((row) => {
			const flat: FlatRow = { dimension: row.name, total: row.total };
			for (const header of columnHeaders) {
				flat[`period_${header}`] = row.periods[header] ?? 0;
			}
			return flat;
		});
	});

	const pinnedBottomRowData = $derived.by((): FlatRow[] => {
		if (reportRows.length === 0) return [];
		const flat: FlatRow = { dimension: reportTotals.name, total: reportTotals.total };
		for (const header of columnHeaders) {
			flat[`period_${header}`] = reportTotals.periods[header] ?? 0;
		}
		return [flat];
	});

	const columnDefs = $derived.by((): ColDef[] => {
		const cols: ColDef[] = [
			{
				field: 'dimension',
				headerName: dimensionLabel,
				pinned: 'left',
				width: 250,
				sortable: true
			}
		];

		for (const header of columnHeaders) {
			cols.push({
				field: `period_${header}`,
				headerName: header,
				width: 130,
				sortable: true,
				type: 'rightAligned',
				valueFormatter: (p: any) => (p.value != null ? fmtValue(p.value) : '-')
			});
		}

		cols.push({
			field: 'total',
			headerName: 'Total',
			width: 150,
			sortable: true,
			sort: 'desc',
			type: 'rightAligned',
			valueFormatter: (p: any) => (p.value != null ? fmtValue(p.value) : '-')
		});

		return cols;
	});

	const gridHeight = $derived(Math.min(600, Math.max(200, (reportRows.length + 2) * 42 + 48)));

	const gridOptions = $derived.by((): GridOptions => ({
		columnDefs,
		pinnedBottomRowData,
		defaultColDef: { resizable: true, suppressMovable: true, sortable: true },
		animateRows: false,
		suppressCellFocus: true
	}));

	// Key to force AG Grid re-creation when columns change
	const gridKey = $derived(`${rowGroup}-${columnBreakdown}-${metric}-${country}-${filterYear}`);

	// ── Excel export ──
	function handleExport() {
		const exportColumns: { header: string; field: string }[] = [
			{ header: dimensionLabel, field: 'dimension' }
		];
		for (const header of columnHeaders) {
			exportColumns.push({ header, field: `period_${header}` });
		}
		exportColumns.push({ header: 'Total', field: 'total' });

		const allRows = [...gridRowData, ...pinnedBottomRowData];

		exportReportToExcel(
			{ title: `Reporte - ${dimensionLabel}`, rows: allRows, columns: exportColumns },
			`reporte_${rowGroup}_${filterYear}.xlsx`
		);
	}

	function handleExportCobrado() {
		const exportColumns = [
			{ header: 'Mes', field: 'mes' },
			{ header: 'Total cobrado', field: 'total' }
		];
		const rows: Record<string, string | number>[] = [
			...cobradoRows,
			{ mes: 'Total', total: cobradoTotal }
		];
		exportReportToExcel({ title: 'Cobrado por mes', rows, columns: exportColumns }, 'cobrado_por_mes.xlsx');
	}

	function handleExportPendiente() {
		const groupLabel = pendienteGroup === 'agency' ? 'Agencia' : 'Cliente';
		const exportColumns = [
			{ header: groupLabel, field: 'grupo' },
			{ header: 'Facturado c/IVA', field: 'facturado' },
			{ header: 'Cobrado', field: 'cobrado' },
			{ header: 'Pendiente', field: 'pendiente' }
		];
		const rows: Record<string, string | number>[] = [
			...pendienteRows,
			{
				grupo: 'Total',
				facturado: pendienteTotals.facturado,
				cobrado: pendienteTotals.cobrado,
				pendiente: pendienteTotals.pendiente
			}
		];
		exportReportToExcel({ title: `Pendiente por ${groupLabel}`, rows, columns: exportColumns }, `pendiente_por_${pendienteGroup}.xlsx`);
	}
</script>

<div class="flex flex-col gap-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Reportes</h1>
			<p class="text-muted-foreground">Genera reportes personalizados</p>
		</div>
		{#if reportType === 'facturacion' && reportRows.length > 0}
			<Button variant="outline" onclick={handleExport}>
				<Download class="mr-2 h-4 w-4" />
				Exportar Excel
			</Button>
		{:else if reportType === 'cobrado' && cobradoRows.length > 0}
			<Button variant="outline" onclick={handleExportCobrado}>
				<Download class="mr-2 h-4 w-4" />
				Exportar Excel
			</Button>
		{:else if reportType === 'pendiente' && pendienteRows.length > 0}
			<Button variant="outline" onclick={handleExportPendiente}>
				<Download class="mr-2 h-4 w-4" />
				Exportar Excel
			</Button>
		{/if}
	</div>

	<!-- Report type selector -->
	<div class="flex flex-col gap-1.5">
		<span class="text-xs font-medium text-muted-foreground">Tipo de reporte</span>
		<div class="inline-flex rounded-md border border-input">
			<button
				class="px-3 py-1.5 text-sm cursor-pointer first:rounded-l-md {reportType === 'facturacion' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}"
				onclick={() => (reportType = 'facturacion')}
			>
				Facturacion
			</button>
			<button
				class="px-3 py-1.5 text-sm cursor-pointer border-l border-input {reportType === 'cobrado' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}"
				onclick={() => (reportType = 'cobrado')}
			>
				Cobrado por mes
			</button>
			<button
				class="px-3 py-1.5 text-sm cursor-pointer border-l border-input last:rounded-r-md {reportType === 'pendiente' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}"
				onclick={() => (reportType = 'pendiente')}
			>
				Pendiente por grupo
			</button>
		</div>
	</div>

	{#if reportType === 'facturacion'}
	<!-- Presets Card -->
	<Card>
		<CardHeader>
			<CardTitle>Presets</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="flex flex-wrap gap-2">
				{#each builtInPresets as preset}
					<Button
						variant="outline"
						size="sm"
						onclick={() => applyPresetConfig(preset.config)}
					>
						{preset.label}
					</Button>
				{/each}
			</div>
			{#if customPresets.length > 0}
				<div class="mt-3 flex flex-wrap gap-2">
					{#each customPresets as preset, i}
						<div class="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-sm">
							<button
								class="hover:underline cursor-pointer"
								onclick={() => applyPresetConfig(preset.config)}
							>
								{preset.name}
							</button>
							<button
								class="ml-1 text-muted-foreground hover:text-destructive cursor-pointer"
								onclick={() => deletePreset(i)}
							>
								<Trash2 class="h-3 w-3" />
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</CardContent>
	</Card>

	<!-- Config Card -->
	<Card>
		<CardHeader>
			<CardTitle>Configuracion</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="flex flex-col gap-4">
				<!-- Row 1: Button groups -->
				<div class="flex flex-wrap gap-6">
					<!-- Filas -->
					<div class="flex flex-col gap-1.5">
						<span class="text-xs font-medium text-muted-foreground">Filas</span>
						<div class="inline-flex rounded-md border border-input">
							<button
								class="px-3 py-1.5 text-sm cursor-pointer first:rounded-l-md last:rounded-r-md {rowGroup === 'client' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}"
								onclick={() => (rowGroup = 'client')}
							>
								Cliente
							</button>
							<button
								class="px-3 py-1.5 text-sm cursor-pointer border-l border-input {rowGroup === 'agency' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}"
								onclick={() => (rowGroup = 'agency')}
							>
								Agencia
							</button>
							<button
								class="px-3 py-1.5 text-sm cursor-pointer border-l border-input last:rounded-r-md {rowGroup === 'channel' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}"
								onclick={() => (rowGroup = 'channel')}
							>
								Canal
							</button>
						</div>
					</div>

					<!-- Columnas -->
					<div class="flex flex-col gap-1.5">
						<span class="text-xs font-medium text-muted-foreground">Columnas</span>
						<div class="inline-flex rounded-md border border-input">
							<button
								class="px-3 py-1.5 text-sm cursor-pointer first:rounded-l-md {columnBreakdown === 'none' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}"
								onclick={() => (columnBreakdown = 'none')}
							>
								Ninguno
							</button>
							<button
								class="px-3 py-1.5 text-sm cursor-pointer border-l border-input {columnBreakdown === 'months' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}"
								onclick={() => (columnBreakdown = 'months')}
							>
								Meses
							</button>
							<button
								class="px-3 py-1.5 text-sm cursor-pointer border-l border-input last:rounded-r-md {columnBreakdown === 'quarters' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}"
								onclick={() => (columnBreakdown = 'quarters')}
							>
								Trimestres
							</button>
						</div>
					</div>

					<!-- Metrica -->
					<div class="flex flex-col gap-1.5">
						<span class="text-xs font-medium text-muted-foreground">Metrica</span>
						<div class="inline-flex rounded-md border border-input">
							<button
								class="px-3 py-1.5 text-sm cursor-pointer first:rounded-l-md {metric === 'net_value' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}"
								onclick={() => (metric = 'net_value')}
							>
								Neto
							</button>
							<button
								class="px-3 py-1.5 text-sm cursor-pointer border-l border-input {metric === 'gross_value' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}"
								onclick={() => (metric = 'gross_value')}
							>
								Bruto
							</button>
							<button
								class="px-3 py-1.5 text-sm cursor-pointer border-l border-input last:rounded-r-md {metric === 'spot_count' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}"
								onclick={() => (metric = 'spot_count')}
							>
								Spots
							</button>
						</div>
					</div>
				</div>

				<!-- Row 2: Filters -->
				<div class="flex flex-wrap items-end gap-3">
					<!-- Ano -->
					<div class="flex flex-col gap-1.5">
						<span class="text-xs font-medium text-muted-foreground">Ano</span>
						<select
							bind:value={filterYear}
							class="h-9 min-w-[100px] rounded-md border border-input bg-background px-3 text-sm shadow-xs"
							onchange={(e) => {
								filterYear = Number((e.target as HTMLSelectElement).value);
							}}
						>
							{#each yearOptions as yr}
								<option value={yr}>{yr}</option>
							{/each}
						</select>
					</div>

					<!-- Mes desde -->
					<div class="flex flex-col gap-1.5">
						<span class="text-xs font-medium text-muted-foreground">Mes desde</span>
						<select
							bind:value={filterMonthFrom}
							class="h-9 min-w-[130px] rounded-md border border-input bg-background px-3 text-sm shadow-xs"
							onchange={(e) => {
								filterMonthFrom = Number((e.target as HTMLSelectElement).value);
							}}
						>
							{#each monthOptions as opt}
								<option value={opt.value}>{opt.label}</option>
							{/each}
						</select>
					</div>

					<!-- Mes hasta -->
					<div class="flex flex-col gap-1.5">
						<span class="text-xs font-medium text-muted-foreground">Mes hasta</span>
						<select
							bind:value={filterMonthTo}
							class="h-9 min-w-[130px] rounded-md border border-input bg-background px-3 text-sm shadow-xs"
							onchange={(e) => {
								filterMonthTo = Number((e.target as HTMLSelectElement).value);
							}}
						>
							{#each monthOptions as opt}
								<option value={opt.value}>{opt.label}</option>
							{/each}
						</select>
					</div>

					<!-- Clientes -->
					<div class="flex flex-col gap-1.5">
						<span class="text-xs font-medium text-muted-foreground">Clientes</span>
						<MultiSelect
							label="Clientes"
							items={countryClients}
							bind:selected={filterClientIds}
							searchable={true}
						/>
					</div>

					<!-- Agencias -->
					<div class="flex flex-col gap-1.5">
						<span class="text-xs font-medium text-muted-foreground">Agencias</span>
						<MultiSelect
							label="Agencias"
							items={countryAgencies}
							bind:selected={filterAgencyIds}
							searchable={true}
						/>
					</div>

					<!-- Canales -->
					<div class="flex flex-col gap-1.5">
						<span class="text-xs font-medium text-muted-foreground">Canales</span>
						<MultiSelect
							label="Canales"
							items={channelList}
							bind:selected={filterChannels}
						/>
					</div>
				</div>

				<!-- Row 3: Save preset -->
				<div class="flex items-end gap-2">
					<div class="flex flex-col gap-1.5">
						<span class="text-xs font-medium text-muted-foreground">Guardar como preset</span>
						<input
							type="text"
							bind:value={presetName}
							placeholder="Nombre del preset"
							class="h-9 min-w-[200px] rounded-md border border-input bg-background px-3 text-sm shadow-xs placeholder:text-muted-foreground"
							onkeydown={(e) => {
								if (e.key === 'Enter') saveCurrentPreset();
							}}
						/>
					</div>
					<Button
						variant="outline"
						size="sm"
						disabled={!presetName.trim()}
						onclick={saveCurrentPreset}
					>
						<Save class="mr-1 h-3.5 w-3.5" />
						Guardar preset
					</Button>
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Results - AG Grid -->
	{#if reportRows.length > 0}
		<Card>
			<CardHeader>
				<CardTitle>
					Resultados ({reportRows.length} {reportRows.length === 1 ? 'fila' : 'filas'})
				</CardTitle>
			</CardHeader>
			<CardContent>
				{#key gridKey}
				<div class={gridClass} style="height: {gridHeight}px; width: 100%;">
					<AgGridSvelte
						{gridOptions}
						{gridClass}
						rowData={gridRowData}
						modules={[ClientSideRowModelModule] as any}
					/>
				</div>
			{/key}
			</CardContent>
		</Card>
	{:else}
		<Card>
			<CardContent class="py-12">
				<p class="text-center text-muted-foreground">
					No hay datos para la configuracion seleccionada. Ajusta los filtros o selecciona un preset.
				</p>
			</CardContent>
		</Card>
	{/if}

	{:else if reportType === 'cobrado'}
	<!-- Report #5: Cobrado por mes -->
	<Card>
		<CardHeader>
			<CardTitle>Filtros</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="flex flex-wrap items-end gap-3">
				<div class="flex flex-col gap-1.5">
					<span class="text-xs font-medium text-muted-foreground">Desde</span>
					<input
						type="month"
						bind:value={cobradoMonthFrom}
						class="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs"
					/>
				</div>
				<div class="flex flex-col gap-1.5">
					<span class="text-xs font-medium text-muted-foreground">Hasta</span>
					<input
						type="month"
						bind:value={cobradoMonthTo}
						class="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs"
					/>
				</div>
				<div class="flex flex-col gap-1.5">
					<span class="text-xs font-medium text-muted-foreground">Agencias</span>
					<MultiSelect
						label="Agencias"
						items={countryAgencies}
						bind:selected={cobradoFilterAgencyIds}
						searchable={true}
					/>
				</div>
				<div class="flex flex-col gap-1.5">
					<span class="text-xs font-medium text-muted-foreground">Clientes</span>
					<MultiSelect
						label="Clientes"
						items={countryClients}
						bind:selected={cobradoFilterClientIds}
						searchable={true}
					/>
				</div>
			</div>
		</CardContent>
	</Card>

	{#if cobradoRows.length > 0}
		<Card>
			<CardHeader>
				<CardTitle>Cobrado por mes ({cobradoRows.length} {cobradoRows.length === 1 ? 'mes' : 'meses'})</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-border">
								<th class="py-2 pr-4 text-left font-medium text-muted-foreground">Mes</th>
								<th class="py-2 text-right font-medium text-muted-foreground">Total cobrado</th>
							</tr>
						</thead>
						<tbody>
							{#each cobradoRows as row}
								<tr class="border-b border-border/50 hover:bg-muted/30">
									<td class="py-2 pr-4">{row.mes}</td>
									<td class="py-2 text-right">{formatCurrency(row.total, country)}</td>
								</tr>
							{/each}
						</tbody>
						<tfoot>
							<tr class="border-t-2 border-border font-semibold">
								<td class="py-2 pr-4">Total</td>
								<td class="py-2 text-right">{formatCurrency(cobradoTotal, country)}</td>
							</tr>
						</tfoot>
					</table>
				</div>
			</CardContent>
		</Card>
	{:else}
		<Card>
			<CardContent class="py-12">
				<p class="text-center text-muted-foreground">
					No hay cobros en el rango seleccionado.
				</p>
			</CardContent>
		</Card>
	{/if}

	{:else if reportType === 'pendiente'}
	<!-- Report #6: Pendiente por agencia/cliente -->
	<Card>
		<CardHeader>
			<CardTitle>Configuracion</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="flex flex-col gap-1.5">
				<span class="text-xs font-medium text-muted-foreground">Agrupar por</span>
				<div class="inline-flex rounded-md border border-input">
					<button
						class="px-3 py-1.5 text-sm cursor-pointer first:rounded-l-md {pendienteGroup === 'client' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}"
						onclick={() => (pendienteGroup = 'client')}
					>
						Cliente
					</button>
					<button
						class="px-3 py-1.5 text-sm cursor-pointer border-l border-input last:rounded-r-md {pendienteGroup === 'agency' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}"
						onclick={() => (pendienteGroup = 'agency')}
					>
						Agencia
					</button>
				</div>
			</div>
		</CardContent>
	</Card>

	{#if pendienteRows.length > 0}
		<Card>
			<CardHeader>
				<CardTitle>Pendiente por {pendienteGroup === 'agency' ? 'agencia' : 'cliente'} ({pendienteRows.length} {pendienteRows.length === 1 ? 'fila' : 'filas'})</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-border">
								<th class="py-2 pr-4 text-left font-medium text-muted-foreground">{pendienteGroup === 'agency' ? 'Agencia' : 'Cliente'}</th>
								<th class="py-2 pr-4 text-right font-medium text-muted-foreground">Facturado c/IVA</th>
								<th class="py-2 pr-4 text-right font-medium text-muted-foreground">Cobrado</th>
								<th class="py-2 text-right font-medium text-muted-foreground">Pendiente</th>
							</tr>
						</thead>
						<tbody>
							{#each pendienteRows as row}
								<tr class="border-b border-border/50 hover:bg-muted/30">
									<td class="py-2 pr-4">{row.grupo}</td>
									<td class="py-2 pr-4 text-right">{formatCurrency(row.facturado, country)}</td>
									<td class="py-2 pr-4 text-right">{formatCurrency(row.cobrado, country)}</td>
									<td class="py-2 text-right {row.pendiente > 0 ? 'text-destructive' : 'text-green-600'}">{formatCurrency(row.pendiente, country)}</td>
								</tr>
							{/each}
						</tbody>
						<tfoot>
							<tr class="border-t-2 border-border font-semibold">
								<td class="py-2 pr-4">Total</td>
								<td class="py-2 pr-4 text-right">{formatCurrency(pendienteTotals.facturado, country)}</td>
								<td class="py-2 pr-4 text-right">{formatCurrency(pendienteTotals.cobrado, country)}</td>
								<td class="py-2 text-right">{formatCurrency(pendienteTotals.pendiente, country)}</td>
							</tr>
						</tfoot>
					</table>
				</div>
			</CardContent>
		</Card>
	{:else}
		<Card>
			<CardContent class="py-12">
				<p class="text-center text-muted-foreground">
					No hay datos de facturacion para la configuracion seleccionada.
				</p>
			</CardContent>
		</Card>
	{/if}

	{/if}
</div>
