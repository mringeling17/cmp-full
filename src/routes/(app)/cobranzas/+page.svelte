<script lang="ts">
	import { selectedCountry, countryConfig } from '$lib/stores/country';
	import { formatCurrency, formatNumber } from '$lib/utils/currency';
	import KpiCard from '$lib/components/dashboard/KpiCard.svelte';
	import DashboardChart from '$lib/components/dashboard/DashboardChart.svelte';
	import MultiSelect from '$lib/components/dashboard/MultiSelect.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import {
		DollarSign,
		Hash,
		Calculator,
		RotateCcw
	} from '@lucide/svelte';
	import type { EChartsOption } from 'echarts';

	let { data } = $props();

	// -----------------------------------------------------------
	// Reactive country (from store)
	// -----------------------------------------------------------
	let country = $state('ar');
	selectedCountry.subscribe((v) => (country = v));

	// -----------------------------------------------------------
	// Local filter state
	// -----------------------------------------------------------
	let dateFrom = $state('');
	let dateTo = $state('');
	let selectedClients = $state<string[]>([]);
	let selectedAgencies = $state<string[]>([]);

	// -----------------------------------------------------------
	// Derive lists for filter dropdowns (scoped to country)
	// -----------------------------------------------------------
	const countryClients = $derived(
		(data.clients ?? [])
			.filter((c) => c.country === country)
			.map((c) => ({ id: c.id, name: c.name }))
	);

	const countryAgencies = $derived(
		(data.agencies ?? [])
			.filter((a) => a.country === country)
			.map((a) => ({ id: a.id, name: a.name }))
	);

	// -----------------------------------------------------------
	// Build a lookup: payment_id -> array of its details
	// -----------------------------------------------------------
	const detailsByPaymentId = $derived(() => {
		const map = new Map<string, typeof data.paymentDetails>();
		for (const detail of data.paymentDetails ?? []) {
			const pid = detail.payment_id;
			if (!map.has(pid)) map.set(pid, []);
			map.get(pid)!.push(detail);
		}
		return map;
	});

	// -----------------------------------------------------------
	// Filter payments reactively
	// -----------------------------------------------------------
	const filteredPayments = $derived(() => {
		let payments = (data.payments ?? []).filter((p) => p.country === country);

		// Date range filter
		if (dateFrom) {
			payments = payments.filter((p) => p.payment_date >= dateFrom);
		}
		if (dateTo) {
			payments = payments.filter((p) => p.payment_date <= dateTo);
		}

		// Client filter: check if ANY of the payment's details link to a selected client
		if (selectedClients.length > 0) {
			payments = payments.filter((p) => {
				const details = detailsByPaymentId().get(p.id) ?? [];
				return details.some((d) => {
					const invoice = d.invoices as { client_id: string | null } | null;
					return invoice?.client_id && selectedClients.includes(invoice.client_id);
				});
			});
		}

		// Agency filter: check if ANY of the payment's details link to a selected agency
		if (selectedAgencies.length > 0) {
			const agencyNames = (data.agencies ?? [])
				.filter((a) => selectedAgencies.includes(a.id))
				.map((a) => a.name);

			payments = payments.filter((p) => {
				const details = detailsByPaymentId().get(p.id) ?? [];
				return details.some((d) => {
					const invoice = d.invoices as { agency: string | null } | null;
					return invoice?.agency && agencyNames.includes(invoice.agency);
				});
			});
		}

		return payments;
	});

	// -----------------------------------------------------------
	// Filtered payment details (details belonging to filtered payments)
	// -----------------------------------------------------------
	const filteredPaymentDetails = $derived(() => {
		const paymentIds = new Set(filteredPayments().map((p) => p.id));
		let details = (data.paymentDetails ?? []).filter((d) => paymentIds.has(d.payment_id));

		// Further filter details by client if selected
		if (selectedClients.length > 0) {
			details = details.filter((d) => {
				const invoice = d.invoices as { client_id: string | null } | null;
				return invoice?.client_id && selectedClients.includes(invoice.client_id);
			});
		}

		// Further filter details by agency if selected
		if (selectedAgencies.length > 0) {
			const agencyNames = (data.agencies ?? [])
				.filter((a) => selectedAgencies.includes(a.id))
				.map((a) => a.name);

			details = details.filter((d) => {
				const invoice = d.invoices as { agency: string | null } | null;
				return invoice?.agency && agencyNames.includes(invoice.agency);
			});
		}

		return details;
	});

	// -----------------------------------------------------------
	// KPI computations
	// -----------------------------------------------------------
	const totalCobrado = $derived(
		filteredPayments().reduce((sum, p) => sum + (p.amount ?? 0), 0)
	);

	const paymentCount = $derived(filteredPayments().length);

	const avgPerPayment = $derived(paymentCount > 0 ? totalCobrado / paymentCount : 0);

	// -----------------------------------------------------------
	// Chart: Pagos Mensuales (bar chart)
	// -----------------------------------------------------------
	const monthlyPaymentsOptions = $derived((): EChartsOption => {
		const payments = filteredPayments();
		const monthlyData = new Map<string, number>();

		for (const p of payments) {
			if (!p.payment_date) continue;
			const key = p.payment_date.substring(0, 7); // YYYY-MM
			monthlyData.set(key, (monthlyData.get(key) ?? 0) + (p.amount ?? 0));
		}

		const months = Array.from(monthlyData.keys()).sort();
		const values = months.map((m) => Math.round(monthlyData.get(m)!));

		const monthLabels = months.map((m) => {
			const [y, mo] = m.split('-');
			const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
			return `${monthNames[parseInt(mo) - 1]} ${y.substring(2)}`;
		});

		return {
			tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
			grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
			xAxis: {
				type: 'category',
				data: monthLabels,
				axisLabel: { rotate: 30, fontSize: 10 }
			},
			yAxis: { type: 'value' },
			series: [
				{
					type: 'bar',
					data: values,
					itemStyle: {
						color: {
							type: 'linear',
							x: 0,
							y: 0,
							x2: 0,
							y2: 1,
							colorStops: [
								{ offset: 0, color: '#10b981' },
								{ offset: 1, color: '#059669' }
							]
						},
						borderRadius: [4, 4, 0, 0]
					}
				}
			]
		};
	});

	// -----------------------------------------------------------
	// Chart: Distribucion por Cliente (pie chart - top 10)
	// -----------------------------------------------------------
	const clientPieOptions = $derived((): EChartsOption => {
		const details = filteredPaymentDetails();
		const clientRevenue = new Map<string, number>();

		for (const d of details) {
			const invoice = d.invoices as { client_id: string | null; clients: { name: string } | null } | null;
			const clientName = invoice?.clients?.name ?? 'Sin cliente';
			clientRevenue.set(clientName, (clientRevenue.get(clientName) ?? 0) + (d.amount ?? 0));
		}

		const pieData = Array.from(clientRevenue.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10)
			.map(([name, value]) => ({ name, value: Math.round(value) }));

		return {
			tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
			legend: {
				type: 'scroll',
				bottom: 0,
				textStyle: { fontSize: 11 }
			},
			series: [
				{
					type: 'pie',
					radius: ['35%', '65%'],
					avoidLabelOverlap: true,
					itemStyle: { borderRadius: 6, borderColor: 'transparent', borderWidth: 2 },
					label: { show: false },
					emphasis: {
						label: { show: true, fontSize: 13, fontWeight: 'bold' }
					},
					data: pieData
				}
			]
		};
	});

	// -----------------------------------------------------------
	// Chart: Distribucion por Agencia (horizontal bar chart)
	// -----------------------------------------------------------
	const agencyBarOptions = $derived((): EChartsOption => {
		const details = filteredPaymentDetails();
		const agencyRevenue = new Map<string, number>();

		for (const d of details) {
			const invoice = d.invoices as { agency: string | null } | null;
			const ag = invoice?.agency || 'Directo';
			agencyRevenue.set(ag, (agencyRevenue.get(ag) ?? 0) + (d.amount ?? 0));
		}

		const sorted = Array.from(agencyRevenue.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10)
			.reverse();

		return {
			tooltip: {
				trigger: 'axis',
				axisPointer: { type: 'shadow' }
			},
			grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
			xAxis: { type: 'value' },
			yAxis: {
				type: 'category',
				data: sorted.map(([name]) => name.length > 20 ? name.substring(0, 20) + '...' : name),
				axisLabel: { fontSize: 11 }
			},
			series: [
				{
					type: 'bar',
					data: sorted.map(([, val]) => Math.round(val)),
					itemStyle: { color: '#8b5cf6', borderRadius: [0, 4, 4, 0] }
				}
			]
		};
	});

	// -----------------------------------------------------------
	// Reset filters
	// -----------------------------------------------------------
	function handleReset() {
		dateFrom = '';
		dateTo = '';
		selectedClients = [];
		selectedAgencies = [];
	}

	const hasActiveFilters = $derived(
		dateFrom !== '' ||
			dateTo !== '' ||
			selectedClients.length > 0 ||
			selectedAgencies.length > 0
	);
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Cobranzas</h1>
			<p class="text-muted-foreground text-sm">
				Analisis de cobros - {$countryConfig.name}
			</p>
		</div>
	</div>

	<!-- Filters -->
	<div class="flex flex-wrap items-center gap-2">
		<div class="flex items-center gap-1.5">
			<label for="cob-date-from" class="text-xs text-muted-foreground whitespace-nowrap">Desde</label>
			<Input id="cob-date-from" type="date" bind:value={dateFrom} class="h-9 w-[140px] text-xs" />
		</div>
		<div class="flex items-center gap-1.5">
			<label for="cob-date-to" class="text-xs text-muted-foreground whitespace-nowrap">Hasta</label>
			<Input id="cob-date-to" type="date" bind:value={dateTo} class="h-9 w-[140px] text-xs" />
		</div>

		<MultiSelect label="Clientes" items={countryClients} bind:selected={selectedClients} />
		<MultiSelect label="Agencias" items={countryAgencies} bind:selected={selectedAgencies} />

		{#if hasActiveFilters}
			<Button variant="ghost" size="sm" onclick={handleReset} class="h-9 gap-1">
				<RotateCcw class="h-3.5 w-3.5" />
				<span class="text-xs">Limpiar</span>
			</Button>
		{/if}
	</div>

	<!-- KPI Cards -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
		<KpiCard
			title="Total Cobrado"
			value={formatCurrency(totalCobrado, country)}
			icon={DollarSign}
		/>
		<KpiCard
			title="Cantidad de Pagos"
			value={formatNumber(paymentCount, 0)}
			icon={Hash}
		/>
		<KpiCard
			title="Promedio por Pago"
			value={formatCurrency(avgPerPayment, country)}
			icon={Calculator}
		/>
	</div>

	<!-- Charts -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Pagos Mensuales -->
		<div class="rounded-xl border bg-card p-4 shadow-sm lg:col-span-2">
			<h3 class="mb-4 text-sm font-semibold">Pagos Mensuales</h3>
			{#if filteredPayments().length > 0}
				<DashboardChart options={monthlyPaymentsOptions()} height="300px" />
			{:else}
				<div class="flex h-[300px] items-center justify-center text-muted-foreground text-sm">
					Sin datos para mostrar
				</div>
			{/if}
		</div>

		<!-- Distribucion por Cliente -->
		<div class="rounded-xl border bg-card p-4 shadow-sm">
			<h3 class="mb-4 text-sm font-semibold">Distribucion por Cliente (Top 10)</h3>
			{#if filteredPaymentDetails().length > 0}
				<DashboardChart options={clientPieOptions()} height="350px" />
			{:else}
				<div class="flex h-[350px] items-center justify-center text-muted-foreground text-sm">
					Sin datos para mostrar
				</div>
			{/if}
		</div>

		<!-- Distribucion por Agencia -->
		<div class="rounded-xl border bg-card p-4 shadow-sm">
			<h3 class="mb-4 text-sm font-semibold">Distribucion por Agencia</h3>
			{#if filteredPaymentDetails().length > 0}
				<DashboardChart options={agencyBarOptions()} height="350px" />
			{:else}
				<div class="flex h-[350px] items-center justify-center text-muted-foreground text-sm">
					Sin datos para mostrar
				</div>
			{/if}
		</div>
	</div>
</div>
