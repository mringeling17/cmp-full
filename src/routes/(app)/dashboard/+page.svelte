<script lang="ts">
	import { selectedCountry, countryConfig } from '$lib/stores/country';
	import { filters } from '$lib/stores/filters';
	import { formatCurrency, formatNumber } from '$lib/utils/currency';
	import KpiCard from '$lib/components/dashboard/KpiCard.svelte';
	import DashboardChart from '$lib/components/dashboard/DashboardChart.svelte';
	import DashboardFilters from '$lib/components/dashboard/DashboardFilters.svelte';
	import {
		DollarSign,
		FileText,
		Users,
		TrendingUp,
		Calculator,
		BarChart3
	} from '@lucide/svelte';
	import type { EChartsOption } from 'echarts';

	let { data } = $props();

	// -----------------------------------------------------------
	// Reactive country / filter values (from stores)
	// -----------------------------------------------------------
	let country = $state('ar');
	let currentFilters = $state({
		dateFrom: null as string | null,
		dateTo: null as string | null,
		clientIds: [] as string[],
		agencyIds: [] as string[],
		channels: [] as string[]
	});

	selectedCountry.subscribe((v) => (country = v));
	filters.subscribe((v) => (currentFilters = v));

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

	const channelList = $derived(() => {
		const channels = new Set<string>();
		for (const inv of data.invoices ?? []) {
			if (inv.country === country && inv.channel) {
				channels.add(inv.channel);
			}
		}
		return Array.from(channels)
			.sort()
			.map((c) => ({ id: c, name: c }));
	});

	// -----------------------------------------------------------
	// Filter invoices reactively
	// -----------------------------------------------------------
	const filteredInvoices = $derived(() => {
		let list = (data.invoices ?? []).filter((inv) => inv.country === country);

		if (currentFilters.dateFrom) {
			list = list.filter((inv) => inv.invoice_date && inv.invoice_date >= currentFilters.dateFrom!);
		}
		if (currentFilters.dateTo) {
			list = list.filter((inv) => inv.invoice_date && inv.invoice_date <= currentFilters.dateTo!);
		}
		if (currentFilters.clientIds.length > 0) {
			list = list.filter((inv) => inv.client_id && currentFilters.clientIds.includes(inv.client_id));
		}
		if (currentFilters.agencyIds.length > 0) {
			list = list.filter((inv) => {
				// Match by agency name since invoices store agency as string name
				const agencyNames = (data.agencies ?? [])
					.filter((a) => currentFilters.agencyIds.includes(a.id))
					.map((a) => a.name);
				return inv.agency && agencyNames.includes(inv.agency);
			});
		}
		if (currentFilters.channels.length > 0) {
			list = list.filter((inv) => inv.channel && currentFilters.channels.includes(inv.channel));
		}

		return list;
	});

	// -----------------------------------------------------------
	// KPI computations
	// -----------------------------------------------------------
	const totalGross = $derived(
		filteredInvoices().reduce((sum, inv) => sum + (inv.gross_value ?? 0), 0)
	);

	const totalNet = $derived(
		filteredInvoices().reduce((sum, inv) => sum + (inv.net_value ?? 0), 0)
	);

	const invoiceCount = $derived(filteredInvoices().length);

	const activeClients = $derived(
		new Set(filteredInvoices().filter((inv) => inv.client_id).map((inv) => inv.client_id)).size
	);

	const avgPerInvoice = $derived(invoiceCount > 0 ? totalNet / invoiceCount : 0);

	// Monthly growth: compare current month vs previous month
	const monthlyGrowth = $derived(() => {
		const invs = filteredInvoices();
		if (invs.length === 0) return null;

		// Group by month
		const byMonth = new Map<string, number>();
		for (const inv of invs) {
			if (!inv.invoice_date) continue;
			const key = inv.invoice_date.substring(0, 7); // YYYY-MM
			byMonth.set(key, (byMonth.get(key) ?? 0) + (inv.net_value ?? 0));
		}

		const months = Array.from(byMonth.keys()).sort();
		if (months.length < 2) return null;

		const currentMonth = byMonth.get(months[months.length - 1]) ?? 0;
		const prevMonth = byMonth.get(months[months.length - 2]) ?? 0;
		if (prevMonth === 0) return null;

		return ((currentMonth - prevMonth) / prevMonth) * 100;
	});

	// -----------------------------------------------------------
	// Chart data computations
	// -----------------------------------------------------------

	// Top 10 Clients by revenue
	const topClientsOptions = $derived((): EChartsOption => {
		const invs = filteredInvoices();
		const clientRevenue = new Map<string, number>();

		for (const inv of invs) {
			const clientName =
				(inv as Record<string, unknown>).clients &&
				typeof (inv as Record<string, unknown>).clients === 'object' &&
				(inv as Record<string, unknown>).clients !== null
					? ((inv as Record<string, unknown>).clients as { name: string }).name
					: 'Sin cliente';
			clientRevenue.set(clientName, (clientRevenue.get(clientName) ?? 0) + (inv.net_value ?? 0));
		}

		const sorted = Array.from(clientRevenue.entries())
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
					itemStyle: { color: '#6366f1', borderRadius: [0, 4, 4, 0] }
				}
			]
		};
	});

	// Channel distribution (pie chart)
	const channelPieOptions = $derived((): EChartsOption => {
		const invs = filteredInvoices();
		const channelRevenue = new Map<string, number>();

		for (const inv of invs) {
			const ch = inv.channel || 'Sin canal';
			channelRevenue.set(ch, (channelRevenue.get(ch) ?? 0) + (inv.net_value ?? 0));
		}

		const pieData = Array.from(channelRevenue.entries())
			.sort((a, b) => b[1] - a[1])
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

	// Agency distribution (bar chart)
	const agencyBarOptions = $derived((): EChartsOption => {
		const invs = filteredInvoices();
		const agencyRevenue = new Map<string, number>();

		for (const inv of invs) {
			const ag = inv.agency || 'Directo';
			agencyRevenue.set(ag, (agencyRevenue.get(ag) ?? 0) + (inv.net_value ?? 0));
		}

		const sorted = Array.from(agencyRevenue.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10);

		return {
			tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
			grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
			xAxis: {
				type: 'category',
				data: sorted.map(([name]) => name.length > 15 ? name.substring(0, 15) + '...' : name),
				axisLabel: { rotate: 30, fontSize: 10 }
			},
			yAxis: { type: 'value' },
			series: [
				{
					type: 'bar',
					data: sorted.map(([, val]) => Math.round(val)),
					itemStyle: { color: '#8b5cf6', borderRadius: [4, 4, 0, 0] }
				}
			]
		};
	});

	// Monthly trend (line chart)
	const monthlyTrendOptions = $derived((): EChartsOption => {
		const invs = filteredInvoices();
		const monthlyData = new Map<string, { gross: number; net: number }>();

		for (const inv of invs) {
			if (!inv.invoice_date) continue;
			const key = inv.invoice_date.substring(0, 7);
			const existing = monthlyData.get(key) ?? { gross: 0, net: 0 };
			existing.gross += inv.gross_value ?? 0;
			existing.net += inv.net_value ?? 0;
			monthlyData.set(key, existing);
		}

		const months = Array.from(monthlyData.keys()).sort();
		const grossValues = months.map((m) => Math.round(monthlyData.get(m)!.gross));
		const netValues = months.map((m) => Math.round(monthlyData.get(m)!.net));

		// Format months for display
		const monthLabels = months.map((m) => {
			const [y, mo] = m.split('-');
			const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
			return `${monthNames[parseInt(mo) - 1]} ${y.substring(2)}`;
		});

		return {
			tooltip: { trigger: 'axis' },
			legend: { data: ['Bruto', 'Neto'], bottom: 0 },
			grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
			xAxis: {
				type: 'category',
				data: monthLabels,
				axisLabel: { fontSize: 10 }
			},
			yAxis: { type: 'value' },
			series: [
				{
					name: 'Bruto',
					type: 'line',
					data: grossValues,
					smooth: true,
					itemStyle: { color: '#6366f1' },
					areaStyle: { color: 'rgba(99, 102, 241, 0.1)' }
				},
				{
					name: 'Neto',
					type: 'line',
					data: netValues,
					smooth: true,
					itemStyle: { color: '#10b981' },
					areaStyle: { color: 'rgba(16, 185, 129, 0.1)' }
				}
			]
		};
	});

	// Quarterly sales (bar chart)
	const quarterlySalesOptions = $derived((): EChartsOption => {
		const invs = filteredInvoices();
		const quarterData = new Map<string, number>();

		for (const inv of invs) {
			if (!inv.invoice_date) continue;
			const date = new Date(inv.invoice_date);
			const year = date.getFullYear();
			const quarter = Math.floor(date.getMonth() / 3) + 1;
			const key = `${year} Q${quarter}`;
			quarterData.set(key, (quarterData.get(key) ?? 0) + (inv.net_value ?? 0));
		}

		const quarters = Array.from(quarterData.keys()).sort();
		const values = quarters.map((q) => Math.round(quarterData.get(q)!));

		return {
			tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
			grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
			xAxis: {
				type: 'category',
				data: quarters,
				axisLabel: { fontSize: 11 }
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
								{ offset: 0, color: '#6366f1' },
								{ offset: 1, color: '#8b5cf6' }
							]
						},
						borderRadius: [4, 4, 0, 0]
					}
				}
			]
		};
	});
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Dashboard</h1>
			<p class="text-muted-foreground text-sm">
				Resumen financiero - {$countryConfig.name}
			</p>
		</div>
	</div>

	<!-- Filters -->
	<DashboardFilters
		clients={countryClients}
		agencies={countryAgencies}
		channels={channelList()}
	/>

	<!-- KPI Cards -->
	<div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
		<KpiCard
			title="Total Bruto"
			value={formatCurrency(totalGross, country)}
			icon={DollarSign}
		/>
		<KpiCard
			title="Total Neto"
			value={formatCurrency(totalNet, country)}
			icon={TrendingUp}
		/>
		<KpiCard
			title="Facturas"
			value={formatNumber(invoiceCount, 0)}
			icon={FileText}
		/>
		<KpiCard
			title="Clientes Activos"
			value={formatNumber(activeClients, 0)}
			icon={Users}
		/>
		<KpiCard
			title="Promedio/Factura"
			value={formatCurrency(avgPerInvoice, country)}
			icon={Calculator}
		/>
		<KpiCard
			title="Crecimiento Mensual"
			value={monthlyGrowth() != null ? `${monthlyGrowth()! >= 0 ? '+' : ''}${monthlyGrowth()!.toFixed(1)}%` : 'N/A'}
			trend={monthlyGrowth()}
			icon={BarChart3}
		/>
	</div>

	<!-- Charts -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Top 10 Clients -->
		<div class="rounded-xl border bg-card p-4 shadow-sm">
			<h3 class="mb-4 text-sm font-semibold">Top 10 Clientes por Ingresos</h3>
			{#if filteredInvoices().length > 0}
				<DashboardChart options={topClientsOptions()} height="350px" />
			{:else}
				<div class="flex h-[350px] items-center justify-center text-muted-foreground text-sm">
					Sin datos para mostrar
				</div>
			{/if}
		</div>

		<!-- Channel Distribution -->
		<div class="rounded-xl border bg-card p-4 shadow-sm">
			<h3 class="mb-4 text-sm font-semibold">Distribucion por Canal</h3>
			{#if filteredInvoices().length > 0}
				<DashboardChart options={channelPieOptions()} height="350px" />
			{:else}
				<div class="flex h-[350px] items-center justify-center text-muted-foreground text-sm">
					Sin datos para mostrar
				</div>
			{/if}
		</div>

		<!-- Agency Distribution -->
		<div class="rounded-xl border bg-card p-4 shadow-sm">
			<h3 class="mb-4 text-sm font-semibold">Distribucion por Agencia</h3>
			{#if filteredInvoices().length > 0}
				<DashboardChart options={agencyBarOptions()} height="350px" />
			{:else}
				<div class="flex h-[350px] items-center justify-center text-muted-foreground text-sm">
					Sin datos para mostrar
				</div>
			{/if}
		</div>

		<!-- Monthly Trend -->
		<div class="rounded-xl border bg-card p-4 shadow-sm">
			<h3 class="mb-4 text-sm font-semibold">Tendencia Mensual</h3>
			{#if filteredInvoices().length > 0}
				<DashboardChart options={monthlyTrendOptions()} height="350px" />
			{:else}
				<div class="flex h-[350px] items-center justify-center text-muted-foreground text-sm">
					Sin datos para mostrar
				</div>
			{/if}
		</div>

		<!-- Quarterly Sales -->
		<div class="rounded-xl border bg-card p-4 shadow-sm lg:col-span-2">
			<h3 class="mb-4 text-sm font-semibold">Ventas Trimestrales</h3>
			{#if filteredInvoices().length > 0}
				<DashboardChart options={quarterlySalesOptions()} height="300px" />
			{:else}
				<div class="flex h-[300px] items-center justify-center text-muted-foreground text-sm">
					Sin datos para mostrar
				</div>
			{/if}
		</div>
	</div>
</div>
