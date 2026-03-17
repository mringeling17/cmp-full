<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import DashboardChart from './DashboardChart.svelte';
	import MultiSelect from './MultiSelect.svelte';
	import { formatCurrency, formatNumber } from '$lib/utils/currency';
	import {
		filterInvoicesByPeriod,
		groupByClient,
		groupByAgency,
		groupByChannel,
		computeDelta,
		type GroupedItem
	} from '$lib/utils/invoice-analytics';
	import type { EChartsOption } from 'echarts';
	import { selectedCountry } from '$lib/stores/country';
	import { ArrowUpDown, Calendar } from '@lucide/svelte';

	let {
		invoices,
		clients,
		agencies
	}: {
		invoices: any[];
		clients: { id: string; name: string; country: string | null }[];
		agencies: { id: string; name: string; country: string | null }[];
	} = $props();

	let country = $state('ar');
	selectedCountry.subscribe((v) => (country = v));

	// Period A state
	let periodAFrom = $state('');
	let periodATo = $state('');

	// Period B state
	let periodBFrom = $state('');
	let periodBTo = $state('');

	// Shared filters
	let selectedClients = $state<string[]>([]);
	let selectedAgencies = $state<string[]>([]);
	let selectedChannels = $state<string[]>([]);

	// Dimension for breakdown
	let dimension = $state<'client' | 'agency' | 'channel'>('client');

	// Country-scoped lists
	const countryInvoices = $derived(invoices.filter((inv) => inv.country === country));
	const countryClients = $derived(
		clients.filter((c) => c.country === country).map((c) => ({ id: c.id, name: c.name }))
	);
	const countryAgencies = $derived(
		agencies.filter((a) => a.country === country).map((a) => ({ id: a.id, name: a.name }))
	);
	const channelList = $derived(() => {
		const channels = new Set<string>();
		for (const inv of countryInvoices) {
			if (inv.channel) channels.add(inv.channel);
		}
		return Array.from(channels).sort().map((c) => ({ id: c, name: c }));
	});

	// Clients map for groupByClient
	const clientsMap = $derived(new Map(clients.map((c) => [c.id, c.name])));

	// Agency names for filtering
	const selectedAgencyNames = $derived(
		agencies.filter((a) => selectedAgencies.includes(a.id)).map((a) => a.name)
	);

	// Filtered invoices for each period
	const periodAInvoices = $derived(
		filterInvoicesByPeriod(
			countryInvoices,
			periodAFrom || null,
			periodATo || null,
			selectedClients.length > 0 ? selectedClients : undefined,
			selectedAgencyNames.length > 0 ? selectedAgencyNames : undefined,
			selectedChannels.length > 0 ? selectedChannels : undefined
		)
	);

	const periodBInvoices = $derived(
		filterInvoicesByPeriod(
			countryInvoices,
			periodBFrom || null,
			periodBTo || null,
			selectedClients.length > 0 ? selectedClients : undefined,
			selectedAgencyNames.length > 0 ? selectedAgencyNames : undefined,
			selectedChannels.length > 0 ? selectedChannels : undefined
		)
	);

	// KPIs
	const totalA = $derived(periodAInvoices.reduce((sum: number, inv: any) => sum + (inv.net_value ?? 0), 0));
	const totalB = $derived(periodBInvoices.reduce((sum: number, inv: any) => sum + (inv.net_value ?? 0), 0));
	const totalDiff = $derived(totalA - totalB);
	const totalDiffPct = $derived(totalB !== 0 ? ((totalA - totalB) / totalB) * 100 : null);

	// Group data by dimension
	function getGrouped(invs: any[]): GroupedItem[] {
		if (dimension === 'client') return groupByClient(invs, clientsMap);
		if (dimension === 'agency') return groupByAgency(invs);
		return groupByChannel(invs);
	}

	const groupedA = $derived(getGrouped(periodAInvoices));
	const groupedB = $derived(getGrouped(periodBInvoices));
	const deltaData = $derived(computeDelta(groupedA, groupedB));

	// Chart: grouped bar chart comparing periods
	const comparisonChartOptions = $derived((): EChartsOption => {
		const top = deltaData.slice(0, 15);
		const names = top.map((d) => d.name.length > 20 ? d.name.substring(0, 20) + '...' : d.name);

		return {
			tooltip: {
				trigger: 'axis',
				axisPointer: { type: 'shadow' },
				formatter: (params: any) => {
					const items = Array.isArray(params) ? params : [params];
					let result = items[0]?.axisValueLabel || '';
					for (const p of items) {
						result += `<br/>${p.marker} ${p.seriesName}: ${formatCurrency(p.value, country)}`;
					}
					return result;
				}
			},
			legend: { data: ['Periodo A', 'Periodo B'], bottom: 0 },
			grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
			xAxis: {
				type: 'category',
				data: names,
				axisLabel: { rotate: 30, fontSize: 10 }
			},
			yAxis: { type: 'value' },
			series: [
				{
					name: 'Periodo A',
					type: 'bar',
					data: top.map((d) => Math.round(d.valueA)),
					itemStyle: { color: '#6366f1', borderRadius: [4, 4, 0, 0] }
				},
				{
					name: 'Periodo B',
					type: 'bar',
					data: top.map((d) => Math.round(d.valueB)),
					itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] }
				}
			]
		};
	});

	// Presets
	function applyPreset(preset: 'month-yoy' | 'quarter-yoy' | 'year-yoy') {
		const now = new Date();
		const y = now.getFullYear();
		const m = now.getMonth() + 1;

		if (preset === 'month-yoy') {
			const prevMonth = m === 1 ? 12 : m - 1;
			const prevMonthYear = m === 1 ? y - 1 : y;
			const lastDay = new Date(prevMonthYear, prevMonth, 0).getDate();
			periodAFrom = `${prevMonthYear}-${String(prevMonth).padStart(2, '0')}-01`;
			periodATo = `${prevMonthYear}-${String(prevMonth).padStart(2, '0')}-${lastDay}`;
			periodBFrom = `${prevMonthYear - 1}-${String(prevMonth).padStart(2, '0')}-01`;
			periodBTo = `${prevMonthYear - 1}-${String(prevMonth).padStart(2, '0')}-${lastDay}`;
		} else if (preset === 'quarter-yoy') {
			const q = Math.floor((m - 1) / 3);
			const qStart = q * 3 + 1;
			const qEnd = qStart + 2;
			const lastDay = new Date(y, qEnd, 0).getDate();
			periodAFrom = `${y}-${String(qStart).padStart(2, '0')}-01`;
			periodATo = `${y}-${String(qEnd).padStart(2, '0')}-${lastDay}`;
			periodBFrom = `${y - 1}-${String(qStart).padStart(2, '0')}-01`;
			periodBTo = `${y - 1}-${String(qEnd).padStart(2, '0')}-${lastDay}`;
		} else {
			periodAFrom = `${y}-01-01`;
			periodATo = `${y}-12-31`;
			periodBFrom = `${y - 1}-01-01`;
			periodBTo = `${y - 1}-12-31`;
		}
	}
</script>

<div class="space-y-6">
	<!-- Presets -->
	<div class="flex flex-wrap items-center gap-2">
		<span class="text-xs text-muted-foreground font-medium">Presets:</span>
		<Button variant="outline" size="sm" class="h-8 text-xs" onclick={() => applyPreset('month-yoy')}>
			Mes vs Año Anterior
		</Button>
		<Button variant="outline" size="sm" class="h-8 text-xs" onclick={() => applyPreset('quarter-yoy')}>
			Trimestre vs Año Anterior
		</Button>
		<Button variant="outline" size="sm" class="h-8 text-xs" onclick={() => applyPreset('year-yoy')}>
			Año vs Año
		</Button>
	</div>

	<!-- Period selectors -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<!-- Period A -->
		<Card.Card>
			<Card.CardHeader class="pb-3">
				<Card.CardTitle class="text-sm font-semibold flex items-center gap-2">
					<Calendar class="h-4 w-4 text-indigo-500" />
					Periodo A
				</Card.CardTitle>
			</Card.CardHeader>
			<Card.CardContent>
				<div class="flex items-center gap-2">
					<div class="flex items-center gap-1.5">
						<label for="pa-from" class="text-xs text-muted-foreground">Desde</label>
						<Input id="pa-from" type="date" bind:value={periodAFrom} class="h-8 w-[140px] text-xs" />
					</div>
					<div class="flex items-center gap-1.5">
						<label for="pa-to" class="text-xs text-muted-foreground">Hasta</label>
						<Input id="pa-to" type="date" bind:value={periodATo} class="h-8 w-[140px] text-xs" />
					</div>
				</div>
			</Card.CardContent>
		</Card.Card>

		<!-- Period B -->
		<Card.Card>
			<Card.CardHeader class="pb-3">
				<Card.CardTitle class="text-sm font-semibold flex items-center gap-2">
					<Calendar class="h-4 w-4 text-amber-500" />
					Periodo B
				</Card.CardTitle>
			</Card.CardHeader>
			<Card.CardContent>
				<div class="flex items-center gap-2">
					<div class="flex items-center gap-1.5">
						<label for="pb-from" class="text-xs text-muted-foreground">Desde</label>
						<Input id="pb-from" type="date" bind:value={periodBFrom} class="h-8 w-[140px] text-xs" />
					</div>
					<div class="flex items-center gap-1.5">
						<label for="pb-to" class="text-xs text-muted-foreground">Hasta</label>
						<Input id="pb-to" type="date" bind:value={periodBTo} class="h-8 w-[140px] text-xs" />
					</div>
				</div>
			</Card.CardContent>
		</Card.Card>
	</div>

	<!-- Optional filters -->
	<div class="flex flex-wrap items-center gap-2">
		<MultiSelect label="Clientes" items={countryClients} bind:selected={selectedClients} searchable={true} />
		<MultiSelect label="Agencias" items={countryAgencies} bind:selected={selectedAgencies} searchable={true} />
		<MultiSelect label="Canales" items={channelList()} bind:selected={selectedChannels} />
	</div>

	<!-- KPI comparison -->
	<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
		<Card.Card>
			<Card.CardHeader class="pb-2">
				<Card.CardTitle class="text-xs font-medium text-muted-foreground">Total Periodo A</Card.CardTitle>
			</Card.CardHeader>
			<Card.CardContent>
				<div class="text-xl font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(totalA, country)}</div>
				<p class="text-xs text-muted-foreground mt-1">{periodAInvoices.length} facturas</p>
			</Card.CardContent>
		</Card.Card>

		<Card.Card>
			<Card.CardHeader class="pb-2">
				<Card.CardTitle class="text-xs font-medium text-muted-foreground">Total Periodo B</Card.CardTitle>
			</Card.CardHeader>
			<Card.CardContent>
				<div class="text-xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(totalB, country)}</div>
				<p class="text-xs text-muted-foreground mt-1">{periodBInvoices.length} facturas</p>
			</Card.CardContent>
		</Card.Card>

		<Card.Card>
			<Card.CardHeader class="pb-2">
				<Card.CardTitle class="text-xs font-medium text-muted-foreground">Diferencia</Card.CardTitle>
			</Card.CardHeader>
			<Card.CardContent>
				<div class="text-xl font-bold {totalDiff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
					{totalDiff >= 0 ? '+' : ''}{formatCurrency(totalDiff, country)}
				</div>
			</Card.CardContent>
		</Card.Card>

		<Card.Card>
			<Card.CardHeader class="pb-2">
				<Card.CardTitle class="text-xs font-medium text-muted-foreground">Variación %</Card.CardTitle>
			</Card.CardHeader>
			<Card.CardContent>
				<div class="text-xl font-bold {totalDiffPct != null && totalDiffPct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
					{totalDiffPct != null ? `${totalDiffPct >= 0 ? '+' : ''}${totalDiffPct.toFixed(1)}%` : 'N/A'}
				</div>
			</Card.CardContent>
		</Card.Card>
	</div>

	<!-- Dimension selector + Chart -->
	<div class="rounded-xl border bg-card p-4 shadow-sm">
		<div class="flex items-center justify-between mb-4">
			<h3 class="text-sm font-semibold flex items-center gap-2">
				<ArrowUpDown class="h-4 w-4" />
				Comparación por Dimensión
			</h3>
			<div class="flex gap-1">
				<Button
					variant={dimension === 'client' ? 'default' : 'outline'}
					size="sm"
					class="h-7 text-xs"
					onclick={() => (dimension = 'client')}
				>
					Cliente
				</Button>
				<Button
					variant={dimension === 'agency' ? 'default' : 'outline'}
					size="sm"
					class="h-7 text-xs"
					onclick={() => (dimension = 'agency')}
				>
					Agencia
				</Button>
				<Button
					variant={dimension === 'channel' ? 'default' : 'outline'}
					size="sm"
					class="h-7 text-xs"
					onclick={() => (dimension = 'channel')}
				>
					Canal
				</Button>
			</div>
		</div>

		{#if deltaData.length > 0}
			<DashboardChart options={comparisonChartOptions()} height="400px" />
		{:else}
			<div class="flex h-[400px] items-center justify-center text-muted-foreground text-sm">
				Selecciona periodos para comparar
			</div>
		{/if}
	</div>

	<!-- Delta table -->
	{#if deltaData.length > 0}
		<div class="rounded-xl border bg-card shadow-sm overflow-hidden">
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b bg-muted/50">
							<th class="text-left px-4 py-3 font-medium">
								{dimension === 'client' ? 'Cliente' : dimension === 'agency' ? 'Agencia' : 'Canal'}
							</th>
							<th class="text-right px-4 py-3 font-medium">Periodo A</th>
							<th class="text-right px-4 py-3 font-medium">Periodo B</th>
							<th class="text-right px-4 py-3 font-medium">Diferencia</th>
							<th class="text-right px-4 py-3 font-medium">%</th>
						</tr>
					</thead>
					<tbody>
						{#each deltaData as row}
							<tr class="border-b last:border-0 hover:bg-muted/30">
								<td class="px-4 py-2.5 font-medium truncate max-w-[200px]">{row.name}</td>
								<td class="px-4 py-2.5 text-right">{formatCurrency(row.valueA, country)}</td>
								<td class="px-4 py-2.5 text-right">{formatCurrency(row.valueB, country)}</td>
								<td class="px-4 py-2.5 text-right {row.delta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
									{row.delta >= 0 ? '+' : ''}{formatCurrency(row.delta, country)}
								</td>
								<td class="px-4 py-2.5 text-right {row.deltaPct != null && row.deltaPct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
									{row.deltaPct != null ? `${row.deltaPct >= 0 ? '+' : ''}${row.deltaPct.toFixed(1)}%` : 'N/A'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
