# Dashboard Enhancements & Report Builder — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add global bruto/neto toggle, comparison enhancements (totals row, aggregate chart, Excel export), dashboard Excel export, and a report builder with presets and custom reports.

**Architecture:** Svelte 5 reactive stores drive a global value mode (net/gross) that all dashboard components consume. Excel export uses SheetJS client-side. Report builder uses AG Grid with dynamically generated columns from a `ReportConfig` object. All data processing extends existing `invoice-analytics.ts` utilities.

**Tech Stack:** SvelteKit 2, Svelte 5 (runes), ECharts 6, AG Grid Community + ag-grid-svelte5, SheetJS (xlsx), Tailwind 4, shadcn/bits-ui

**Spec:** `docs/superpowers/specs/2026-03-18-dashboard-enhancements-design.md`

**Note:** This project has no test framework configured (no vitest/jest). Steps focus on manual verification via `npm run dev`.

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `src/lib/stores/value-mode.ts` | Global bruto/neto store, persisted to localStorage |
| `src/lib/utils/excel-export.ts` | Excel export functions for dashboard and comparison views |
| `src/lib/utils/report-engine.ts` | `generateReportData()` function for the report builder |
| `src/lib/components/dashboard/ValueModeToggle.svelte` | Toggle switch component for bruto/neto |
| `src/lib/components/dashboard/AggregateComparisonChart.svelte` | Totals bar chart for comparison view |
| `src/routes/(app)/reportes/+page.svelte` | Report builder page |
| `src/routes/(app)/reportes/+page.server.ts` | Server load for report builder (same data as dashboard) |

### Modified Files

| File | Changes |
|------|---------|
| `src/lib/utils/invoice-analytics.ts` | Add `valueField` parameter to `groupByClient/Agency/Channel` |
| `src/routes/(app)/dashboard/+page.svelte` | Wire value mode to KPIs/charts, add export button, add Reportes tab |
| `src/lib/components/dashboard/PeriodComparison.svelte` | Wire value mode, add totals row, aggregate chart, export button |
| `src/lib/components/Sidebar.svelte` | Add "Reportes" nav entry |

---

## Task 1: Value Mode Store + Toggle Component

**Files:**
- Create: `src/lib/stores/value-mode.ts`
- Create: `src/lib/components/dashboard/ValueModeToggle.svelte`

- [ ] **Step 1: Create the value mode store**

Create `src/lib/stores/value-mode.ts`:

```typescript
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

export type ValueMode = 'net' | 'gross';

const stored = browser ? (localStorage.getItem('cmp-value-mode') as ValueMode) : null;
export const valueMode = writable<ValueMode>(
	stored === 'gross' ? 'gross' : 'net'
);

if (browser) {
	valueMode.subscribe((value) => localStorage.setItem('cmp-value-mode', value));
}

export const valueField = derived(valueMode, ($mode) =>
	$mode === 'net' ? 'net_value' : 'gross_value'
);

export const valueLabel = derived(valueMode, ($mode) =>
	$mode === 'net' ? 'Neta' : 'Bruta'
);
```

- [ ] **Step 2: Create the toggle component**

Create `src/lib/components/dashboard/ValueModeToggle.svelte`:

```svelte
<script lang="ts">
	import { valueMode } from '$lib/stores/value-mode';
	import { Button } from '$lib/components/ui/button/index.js';

	let mode = $state<'net' | 'gross'>('net');
	valueMode.subscribe((v) => (mode = v));

	function toggle() {
		valueMode.set(mode === 'net' ? 'gross' : 'net');
	}
</script>

<div class="flex items-center gap-1 rounded-lg border p-0.5">
	<Button
		variant={mode === 'net' ? 'default' : 'ghost'}
		size="sm"
		class="h-7 text-xs px-3"
		onclick={() => valueMode.set('net')}
	>
		Neto
	</Button>
	<Button
		variant={mode === 'gross' ? 'default' : 'ghost'}
		size="sm"
		class="h-7 text-xs px-3"
		onclick={() => valueMode.set('gross')}
	>
		Bruto
	</Button>
</div>
```

- [ ] **Step 3: Verify** — Run `npm run dev`, import the toggle in the dashboard page temporarily, confirm it renders and switches between states. Check localStorage persists the value on page reload.

---

## Task 2: Update invoice-analytics.ts

**Files:**
- Modify: `src/lib/utils/invoice-analytics.ts`

- [ ] **Step 1: Add `valueField` parameter to groupByClient**

Change the function signature and body. The `valueField` parameter defaults to `'net_value'` for backward compatibility:

```typescript
export function groupByClient(
	invoices: Invoice[],
	clientsMap: ClientsMap,
	valueField: 'net_value' | 'gross_value' = 'net_value'
): GroupedItem[] {
	const revenue = new Map<string, number>();

	for (const inv of invoices) {
		const name = (inv.client_id && clientsMap.get(inv.client_id)) || 'Sin cliente';
		revenue.set(name, (revenue.get(name) ?? 0) + (inv[valueField] ?? 0));
	}

	return Array.from(revenue.entries())
		.map(([name, value]) => ({ name, value }))
		.sort((a, b) => b.value - a.value);
}
```

- [ ] **Step 2: Same change for groupByAgency**

```typescript
export function groupByAgency(
	invoices: Invoice[],
	valueField: 'net_value' | 'gross_value' = 'net_value'
): GroupedItem[] {
	const revenue = new Map<string, number>();

	for (const inv of invoices) {
		const name = inv.agency || 'Directo';
		revenue.set(name, (revenue.get(name) ?? 0) + (inv[valueField] ?? 0));
	}

	return Array.from(revenue.entries())
		.map(([name, value]) => ({ name, value }))
		.sort((a, b) => b.value - a.value);
}
```

- [ ] **Step 3: Same change for groupByChannel**

```typescript
export function groupByChannel(
	invoices: Invoice[],
	valueField: 'net_value' | 'gross_value' = 'net_value'
): GroupedItem[] {
	const revenue = new Map<string, number>();

	for (const inv of invoices) {
		const name = inv.channel || 'Sin canal';
		revenue.set(name, (revenue.get(name) ?? 0) + (inv[valueField] ?? 0));
	}

	return Array.from(revenue.entries())
		.map(([name, value]) => ({ name, value }))
		.sort((a, b) => b.value - a.value);
}
```

- [ ] **Step 4: Verify** — Run `npm run dev`, navigate to dashboard and comparison tabs. Everything should work identically since default is `'net_value'`.

---

## Task 3: Wire Value Mode to Dashboard

**Files:**
- Modify: `src/routes/(app)/dashboard/+page.svelte`

- [ ] **Step 1: Add imports and subscribe to value mode store**

At the top of the `<script>` block, add:

```typescript
import ValueModeToggle from '$lib/components/dashboard/ValueModeToggle.svelte';
import { valueMode, valueField, valueLabel } from '$lib/stores/value-mode';

let currentValueMode = $state<'net' | 'gross'>('net');
let currentValueField = $state<'net_value' | 'gross_value'>('net_value');
let currentValueLabel = $state('Neta');

valueMode.subscribe((v) => (currentValueMode = v));
valueField.subscribe((v) => (currentValueField = v));
valueLabel.subscribe((v) => (currentValueLabel = v));
```

- [ ] **Step 2: Add toggle to the dashboard header**

In the template, find the header div (line ~429-436) and add the toggle next to the title:

```svelte
<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Dashboard</h1>
		<p class="text-muted-foreground text-sm">
			Resumen financiero - {$countryConfig.name}
		</p>
	</div>
	<ValueModeToggle />
</div>
```

- [ ] **Step 3: Update KPI cards to use value mode**

Replace the primary total KPI. When mode is `'net'`, show "Total Neto"; when `'gross'`, show "Total Bruto". Update the `totalGross` and `totalNet` usage:

```svelte
<KpiCard
	title="Venta {currentValueLabel}"
	value={formatCurrency(currentValueField === 'net_value' ? totalNet : totalGross, country)}
	icon={DollarSign}
/>
```

Remove the other total card (if both "Total Bruto" and "Total Neto" were showing, keep only one dynamic card). Adjust the grid to `lg:grid-cols-5` if going from 6 to 5 cards, or keep 6 and show both but highlight the selected one.

Decision: Keep both cards but visually highlight the active one. Add opacity to the inactive card:

```svelte
<KpiCard
	title="Total Bruto"
	value={formatCurrency(totalGross, country)}
	icon={DollarSign}
	class={currentValueMode === 'net' ? 'opacity-50' : ''}
/>
<KpiCard
	title="Total Neto"
	value={formatCurrency(totalNet, country)}
	icon={TrendingUp}
	class={currentValueMode === 'gross' ? 'opacity-50' : ''}
/>
```

- [ ] **Step 4: Update YoY growth to use value mode**

In the `monthlyGrowth` derived computation (line ~119-169), change the two lines that use `net_value`:

```typescript
const currentTotal = invs.reduce((sum, inv) => sum + (inv[currentValueField] ?? 0), 0);
// ...
const prevTotal = prevInvs.reduce((sum, inv) => sum + (inv[currentValueField] ?? 0), 0);
```

- [ ] **Step 5: Update chart data to use value mode**

For each chart computation, replace hardcoded `net_value` with `currentValueField`:

**topClientsOptions** (~line 176-219): Change `inv.net_value` to `inv[currentValueField]`

**channelPieOptions** (~line 222-262): Change `inv.net_value` to `inv[currentValueField]`

**agencyBarOptions** (~line 265-302): Change `inv.net_value` to `inv[currentValueField]`

**quarterlySalesOptions** (~line 371-424): Change `inv.net_value` to `inv[currentValueField]`

- [ ] **Step 6: Update monthly trend to show single series**

Replace the `monthlyTrendOptions` (~line 305-368) series array to show only the selected value:

```typescript
const monthlyTrendOptions = $derived((): EChartsOption => {
	const invs = filteredInvoices();
	const monthlyData = new Map<string, number>();

	for (const inv of invs) {
		if (!inv.invoice_date) continue;
		const key = inv.invoice_date.substring(0, 7);
		monthlyData.set(key, (monthlyData.get(key) ?? 0) + (inv[currentValueField] ?? 0));
	}

	const months = Array.from(monthlyData.keys()).sort();
	const values = months.map((m) => Math.round(monthlyData.get(m)!));

	const monthLabels = months.map((m) => {
		const [y, mo] = m.split('-');
		const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
		return `${monthNames[parseInt(mo) - 1]} ${y.substring(2)}`;
	});

	return {
		tooltip: {
			trigger: 'axis',
			formatter: (params: any) => {
				const p = Array.isArray(params) ? params[0] : params;
				return `${p.axisValueLabel}: ${formatCurrency(p.value, country)}`;
			}
		},
		grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
		xAxis: {
			type: 'category',
			data: monthLabels,
			axisLabel: { fontSize: 10 }
		},
		yAxis: { type: 'value' },
		series: [
			{
				name: `Venta ${currentValueLabel}`,
				type: 'line',
				data: values,
				smooth: true,
				itemStyle: { color: currentValueMode === 'net' ? '#10b981' : '#6366f1' },
				areaStyle: {
					color: currentValueMode === 'net'
						? 'rgba(16, 185, 129, 0.1)'
						: 'rgba(99, 102, 241, 0.1)'
				}
			}
		]
	};
});
```

- [ ] **Step 7: Update chart titles to be dynamic**

Change all hardcoded "Venta Neta" in chart section headings:

```svelte
<h3 class="mb-4 text-sm font-semibold">Top 10 Clientes - Venta {currentValueLabel}</h3>
```

Same for: "Distribucion por Canal", "Distribucion por Agencia", "Tendencia Mensual", "Ventas Trimestrales".

- [ ] **Step 8: Verify** — Run `npm run dev`. Toggle between Neto/Bruto. Confirm:
  - KPI cards update values
  - All chart data changes
  - Chart titles update
  - Monthly trend shows single series
  - Toggle state persists across page reload

---

## Task 4: Wire Value Mode to Comparison + Totals Row

**Files:**
- Modify: `src/lib/components/dashboard/PeriodComparison.svelte`

- [ ] **Step 1: Import and subscribe to value mode store**

Add at the top of the `<script>`:

```typescript
import { valueMode, valueField, valueLabel } from '$lib/stores/value-mode';

let currentValueField = $state<'net_value' | 'gross_value'>('net_value');
let currentValueLabel = $state('Neta');

valueField.subscribe((v) => (currentValueField = v));
valueLabel.subscribe((v) => (currentValueLabel = v));
```

- [ ] **Step 2: Update KPI totals to use value mode**

Change lines 110-113:

```typescript
const totalA = $derived(periodAInvoices.reduce((sum: number, inv: any) => sum + (inv[currentValueField] ?? 0), 0));
const totalB = $derived(periodBInvoices.reduce((sum: number, inv: any) => sum + (inv[currentValueField] ?? 0), 0));
```

- [ ] **Step 3: Update getGrouped to pass valueField**

Change lines 116-120:

```typescript
function getGrouped(invs: any[]): GroupedItem[] {
	if (dimension === 'client') return groupByClient(invs, clientsMap, currentValueField);
	if (dimension === 'agency') return groupByAgency(invs, currentValueField);
	return groupByChannel(invs, currentValueField);
}
```

- [ ] **Step 4: Add totals footer row to the delta table**

After the `</tbody>` tag (~line 388), before `</table>`, add:

```svelte
<tfoot>
	<tr class="border-t-2 bg-muted/50">
		<td class="px-4 py-2.5 font-bold">Total general</td>
		<td class="px-4 py-2.5 text-right font-bold">{formatCurrency(totalA, country)}</td>
		<td class="px-4 py-2.5 text-right font-bold">{formatCurrency(totalB, country)}</td>
		<td class="px-4 py-2.5 text-right font-bold {totalDiff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
			{totalDiff >= 0 ? '+' : ''}{formatCurrency(totalDiff, country)}
		</td>
		<td class="px-4 py-2.5 text-right font-bold {totalDiffPct != null && totalDiffPct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
			{totalDiffPct != null ? `${totalDiffPct >= 0 ? '+' : ''}${totalDiffPct.toFixed(1)}%` : 'N/A'}
		</td>
	</tr>
</tfoot>
```

- [ ] **Step 5: Update KPI card labels**

Change "Total Periodo A" to include value mode label. Update the card titles (~lines 273, 283):

```svelte
<Card.CardTitle class="text-xs font-medium text-muted-foreground">Total Periodo A (Venta {currentValueLabel})</Card.CardTitle>
```

Same for Periodo B.

- [ ] **Step 6: Verify** — Run `npm run dev`. Go to Comparacion tab. Toggle bruto/neto. Confirm:
  - KPI cards use correct values
  - Delta table values change
  - Totals footer row appears with correct sums
  - Chart data updates

---

## Task 5: Aggregate Comparison Chart

**Files:**
- Create: `src/lib/components/dashboard/AggregateComparisonChart.svelte`
- Modify: `src/lib/components/dashboard/PeriodComparison.svelte`

- [ ] **Step 1: Create the aggregate chart component**

Create `src/lib/components/dashboard/AggregateComparisonChart.svelte`:

```svelte
<script lang="ts">
	import DashboardChart from './DashboardChart.svelte';
	import { formatCurrency } from '$lib/utils/currency';
	import type { EChartsOption } from 'echarts';

	let {
		totalA,
		totalB,
		country
	}: {
		totalA: number;
		totalB: number;
		country: string;
	} = $props();

	const chartOptions = $derived((): EChartsOption => {
		const diff = totalA - totalB;
		const diffPct = totalB !== 0 ? ((diff) / totalB * 100).toFixed(1) : null;
		const diffLabel = diffPct != null ? `${diff >= 0 ? '+' : ''}${diffPct}%` : '';

		return {
			tooltip: {
				trigger: 'axis',
				axisPointer: { type: 'shadow' },
				formatter: (params: any) => {
					const items = Array.isArray(params) ? params : [params];
					let result = '';
					for (const p of items) {
						result += `${p.marker} ${p.seriesName}: ${formatCurrency(p.value, country)}<br/>`;
					}
					return result;
				}
			},
			grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
			xAxis: {
				type: 'category',
				data: ['Total'],
				axisLabel: { show: false }
			},
			yAxis: { type: 'value' },
			graphic: totalA > 0 || totalB > 0 ? [
				{
					type: 'text',
					left: 'center',
					top: 5,
					style: {
						text: `Diferencia: ${formatCurrency(diff, country)} (${diffLabel})`,
						fontSize: 13,
						fontWeight: 'bold',
						fill: diff >= 0 ? '#16a34a' : '#dc2626'
					}
				}
			] : [],
			series: [
				{
					name: 'Periodo A',
					type: 'bar',
					data: [Math.round(totalA)],
					itemStyle: { color: '#6366f1', borderRadius: [4, 4, 0, 0] },
					barWidth: '35%'
				},
				{
					name: 'Periodo B',
					type: 'bar',
					data: [Math.round(totalB)],
					itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] },
					barWidth: '35%'
				}
			]
		};
	});
</script>

{#if totalA > 0 || totalB > 0}
	<div class="rounded-xl border bg-card p-4 shadow-sm">
		<h3 class="text-sm font-semibold mb-2">Total Comparativo</h3>
		<DashboardChart options={chartOptions()} height="200px" />
	</div>
{/if}
```

- [ ] **Step 2: Add aggregate chart to PeriodComparison**

Import the component in `PeriodComparison.svelte`:

```typescript
import AggregateComparisonChart from './AggregateComparisonChart.svelte';
```

Add it in the template, after the KPI cards grid and before the "Comparacion por Dimension" section (~after line 312):

```svelte
<!-- Aggregate totals chart -->
<AggregateComparisonChart {totalA} {totalB} {country} />
```

- [ ] **Step 3: Verify** — Run `npm run dev`. Go to Comparacion, select periods. Confirm the aggregate chart appears showing two bars with the difference label.

---

## Task 6: Excel Export Utilities

**Files:**
- Create: `src/lib/utils/excel-export.ts`

- [ ] **Step 1: Create the export utility file**

Create `src/lib/utils/excel-export.ts`:

```typescript
import * as XLSX from 'xlsx';
import { formatCurrency } from './currency';

interface DashboardExportData {
	kpis: { label: string; value: string }[];
	topClients: { name: string; value: number }[];
	channelDistribution: { name: string; value: number; percent: number }[];
	agencyDistribution: { name: string; value: number }[];
	monthlyTrend: { month: string; value: number }[];
	quarterly: { quarter: string; value: number }[];
}

interface ComparisonExportData {
	totalA: number;
	totalB: number;
	diff: number;
	diffPct: number | null;
	dimensionLabel: string;
	rows: {
		name: string;
		valueA: number;
		valueB: number;
		delta: number;
		deltaPct: number | null;
	}[];
}

interface ReportExportData {
	title: string;
	rows: Record<string, string | number>[];
	columns: { header: string; field: string }[];
}

export function exportDashboardToExcel(data: DashboardExportData, country: string, filename: string): void {
	const wb = XLSX.utils.book_new();

	// Sheet 1: KPIs
	const kpiData = data.kpis.map((k) => ({ Indicador: k.label, Valor: k.value }));
	const kpiSheet = XLSX.utils.json_to_sheet(kpiData);
	kpiSheet['!cols'] = [{ wch: 20 }, { wch: 25 }];
	XLSX.utils.book_append_sheet(wb, kpiSheet, 'KPIs');

	// Sheet 2: Top Clientes
	const clientSheet = XLSX.utils.json_to_sheet(
		data.topClients.map((c) => ({ Cliente: c.name, Monto: c.value }))
	);
	clientSheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
	XLSX.utils.book_append_sheet(wb, clientSheet, 'Top Clientes');

	// Sheet 3: Por Canal
	const channelSheet = XLSX.utils.json_to_sheet(
		data.channelDistribution.map((c) => ({
			Canal: c.name,
			Monto: c.value,
			'%': c.percent
		}))
	);
	channelSheet['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 10 }];
	XLSX.utils.book_append_sheet(wb, channelSheet, 'Por Canal');

	// Sheet 4: Por Agencia
	const agencySheet = XLSX.utils.json_to_sheet(
		data.agencyDistribution.map((a) => ({ Agencia: a.name, Monto: a.value }))
	);
	agencySheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
	XLSX.utils.book_append_sheet(wb, agencySheet, 'Por Agencia');

	// Sheet 5: Tendencia Mensual
	const monthSheet = XLSX.utils.json_to_sheet(
		data.monthlyTrend.map((m) => ({ Mes: m.month, Monto: m.value }))
	);
	monthSheet['!cols'] = [{ wch: 15 }, { wch: 20 }];
	XLSX.utils.book_append_sheet(wb, monthSheet, 'Tendencia Mensual');

	// Sheet 6: Trimestral
	const qSheet = XLSX.utils.json_to_sheet(
		data.quarterly.map((q) => ({ Trimestre: q.quarter, Monto: q.value }))
	);
	qSheet['!cols'] = [{ wch: 15 }, { wch: 20 }];
	XLSX.utils.book_append_sheet(wb, qSheet, 'Trimestral');

	XLSX.writeFile(wb, filename);
}

export function exportComparisonToExcel(data: ComparisonExportData, country: string, filename: string): void {
	const wb = XLSX.utils.book_new();

	// Sheet 1: Resumen
	const resumenData = [
		{ Indicador: 'Total Periodo A', Valor: data.totalA },
		{ Indicador: 'Total Periodo B', Valor: data.totalB },
		{ Indicador: 'Diferencia', Valor: data.diff },
		{ Indicador: 'Variacion %', Valor: data.diffPct != null ? `${data.diffPct.toFixed(1)}%` : 'N/A' }
	];
	const resumenSheet = XLSX.utils.json_to_sheet(resumenData);
	resumenSheet['!cols'] = [{ wch: 20 }, { wch: 25 }];
	XLSX.utils.book_append_sheet(wb, resumenSheet, 'Resumen');

	// Sheet 2: Detalle
	const detalleRows = data.rows.map((r) => ({
		[data.dimensionLabel]: r.name,
		'Periodo A': r.valueA,
		'Periodo B': r.valueB,
		Diferencia: r.delta,
		'%': r.deltaPct != null ? `${r.deltaPct.toFixed(1)}%` : 'N/A'
	}));
	// Add total row
	detalleRows.push({
		[data.dimensionLabel]: 'Total general',
		'Periodo A': data.totalA,
		'Periodo B': data.totalB,
		Diferencia: data.diff,
		'%': data.diffPct != null ? `${data.diffPct.toFixed(1)}%` : 'N/A'
	});
	const detalleSheet = XLSX.utils.json_to_sheet(detalleRows);
	detalleSheet['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 10 }];
	XLSX.utils.book_append_sheet(wb, detalleSheet, `Por ${data.dimensionLabel}`);

	XLSX.writeFile(wb, filename);
}

export function exportReportToExcel(data: ReportExportData, filename: string): void {
	const wb = XLSX.utils.book_new();

	const sheetData = data.rows.map((row) => {
		const out: Record<string, string | number> = {};
		for (const col of data.columns) {
			out[col.header] = row[col.field] ?? '';
		}
		return out;
	});

	const sheet = XLSX.utils.json_to_sheet(sheetData);
	sheet['!cols'] = data.columns.map((col, i) => ({ wch: i === 0 ? 35 : 18 }));
	XLSX.utils.book_append_sheet(wb, sheet, 'Reporte');

	XLSX.writeFile(wb, filename);
}
```

- [ ] **Step 2: Verify** — No runtime verification needed yet; this is a pure utility. It will be wired up in the next tasks.

---

## Task 7: Dashboard Excel Export Button

**Files:**
- Modify: `src/routes/(app)/dashboard/+page.svelte`

- [ ] **Step 1: Import the export function and Download icon**

Add to imports:

```typescript
import { exportDashboardToExcel } from '$lib/utils/excel-export';
import { Download } from '@lucide/svelte';
import { Button } from '$lib/components/ui/button/index.js';
```

(Button may already be imported via KpiCard or similar — check first.)

- [ ] **Step 2: Create export handler function**

Add a function in the `<script>` block:

```typescript
function handleDashboardExport() {
	const invs = filteredInvoices();
	const field = currentValueField;

	// Top clients
	const clientRevenue = new Map<string, number>();
	for (const inv of invs) {
		const clientName =
			inv.clients && typeof inv.clients === 'object' && inv.clients !== null
				? (inv.clients as { name: string }).name
				: 'Sin cliente';
		clientRevenue.set(clientName, (clientRevenue.get(clientName) ?? 0) + (inv[field] ?? 0));
	}
	const topClients = Array.from(clientRevenue.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, 10)
		.map(([name, value]) => ({ name, value: Math.round(value) }));

	// Channel distribution
	const channelRevenue = new Map<string, number>();
	for (const inv of invs) {
		const ch = inv.channel || 'Sin canal';
		channelRevenue.set(ch, (channelRevenue.get(ch) ?? 0) + (inv[field] ?? 0));
	}
	const totalForPercent = Array.from(channelRevenue.values()).reduce((a, b) => a + b, 0);
	const channelDistribution = Array.from(channelRevenue.entries())
		.sort((a, b) => b[1] - a[1])
		.map(([name, value]) => ({
			name,
			value: Math.round(value),
			percent: totalForPercent > 0 ? Math.round((value / totalForPercent) * 1000) / 10 : 0
		}));

	// Agency distribution
	const agencyRevenue = new Map<string, number>();
	for (const inv of invs) {
		const ag = inv.agency || 'Directo';
		agencyRevenue.set(ag, (agencyRevenue.get(ag) ?? 0) + (inv[field] ?? 0));
	}
	const agencyDistribution = Array.from(agencyRevenue.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, 10)
		.map(([name, value]) => ({ name, value: Math.round(value) }));

	// Monthly trend
	const monthlyData = new Map<string, number>();
	for (const inv of invs) {
		if (!inv.invoice_date) continue;
		const key = inv.invoice_date.substring(0, 7);
		monthlyData.set(key, (monthlyData.get(key) ?? 0) + (inv[field] ?? 0));
	}
	const monthlyTrend = Array.from(monthlyData.entries())
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([month, value]) => ({ month, value: Math.round(value) }));

	// Quarterly
	const quarterData = new Map<string, number>();
	for (const inv of invs) {
		if (!inv.invoice_date) continue;
		const date = new Date(inv.invoice_date);
		const year = date.getFullYear();
		const quarter = Math.floor(date.getMonth() / 3) + 1;
		const key = `${year} Q${quarter}`;
		quarterData.set(key, (quarterData.get(key) ?? 0) + (inv[field] ?? 0));
	}
	const quarterly = Array.from(quarterData.entries())
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([quarter, value]) => ({ quarter, value: Math.round(value) }));

	const modeLabel = currentValueMode === 'net' ? 'Neto' : 'Bruto';
	const dateFrom = currentFilters.dateFrom ?? '';
	const dateTo = currentFilters.dateTo ?? '';
	exportDashboardToExcel(
		{
			kpis: [
				{ label: `Total Bruto`, value: formatCurrency(totalGross, country) },
				{ label: `Total Neto`, value: formatCurrency(totalNet, country) },
				{ label: 'Facturas', value: String(invoiceCount) },
				{ label: 'Clientes Activos', value: String(activeClients) },
				{ label: 'Spots', value: String(totalSpotCount) },
				{ label: 'Crecimiento YoY', value: monthlyGrowth() != null ? `${monthlyGrowth()!.toFixed(1)}%` : 'N/A' }
			],
			topClients,
			channelDistribution,
			agencyDistribution,
			monthlyTrend,
			quarterly
		},
		country,
		`Dashboard_${country.toUpperCase()}_${dateFrom}_${dateTo}.xlsx`
	);
}
```

- [ ] **Step 3: Add export button to the Resumen tab**

Add a button next to the filters or in the header area of the Resumen tab content, after the `<DashboardFilters>` component:

```svelte
<div class="flex items-center justify-between">
	<DashboardFilters
		clients={countryClients}
		agencies={countryAgencies}
		channels={channelList()}
	/>
	<Button variant="outline" size="sm" class="h-8 gap-2" onclick={handleDashboardExport}>
		<Download class="h-4 w-4" />
		Exportar Excel
	</Button>
</div>
```

Note: This may require adjusting the existing layout since `DashboardFilters` currently takes the full width. Wrap both in a flex container.

- [ ] **Step 4: Verify** — Run `npm run dev`. Click "Exportar Excel" on the dashboard. Confirm an `.xlsx` file downloads with 6 sheets containing correct data.

---

## Task 8: Comparison Excel Export Button

**Files:**
- Modify: `src/lib/components/dashboard/PeriodComparison.svelte`

- [ ] **Step 1: Import export function and icon**

```typescript
import { exportComparisonToExcel } from '$lib/utils/excel-export';
import { Download } from '@lucide/svelte';
```

- [ ] **Step 2: Create export handler**

```typescript
function handleComparisonExport() {
	const dimensionLabel = dimension === 'client' ? 'Cliente' : dimension === 'agency' ? 'Agencia' : 'Canal';
	exportComparisonToExcel(
		{
			totalA,
			totalB,
			diff: totalDiff,
			diffPct: totalDiffPct,
			dimensionLabel,
			rows: deltaData
		},
		country,
		`Comparacion_${periodAFrom}_${periodATo}_vs_${periodBFrom}_${periodBTo}_${country.toUpperCase()}.xlsx`
	);
}
```

- [ ] **Step 3: Add export button**

Add next to the presets row (~line 202-213):

```svelte
<div class="flex flex-wrap items-center justify-between gap-2">
	<div class="flex flex-wrap items-center gap-2">
		<span class="text-xs text-muted-foreground font-medium">Presets:</span>
		<Button variant="outline" size="sm" class="h-8 text-xs" onclick={() => applyPreset('month-yoy')}>
			Mes vs Ano Anterior
		</Button>
		<Button variant="outline" size="sm" class="h-8 text-xs" onclick={() => applyPreset('quarter-yoy')}>
			Trimestre vs Ano Anterior
		</Button>
		<Button variant="outline" size="sm" class="h-8 text-xs" onclick={() => applyPreset('year-yoy')}>
			Ano vs Ano
		</Button>
	</div>
	{#if deltaData.length > 0}
		<Button variant="outline" size="sm" class="h-8 gap-2" onclick={handleComparisonExport}>
			<Download class="h-4 w-4" />
			Exportar Excel
		</Button>
	{/if}
</div>
```

- [ ] **Step 4: Verify** — Run `npm run dev`. Go to Comparacion, select periods, click "Exportar Excel". Confirm the file has 2 sheets with correct data including the total row.

---

## Task 9: Add "Reportes" to Sidebar

**Files:**
- Modify: `src/lib/components/Sidebar.svelte`

- [ ] **Step 1: Add the icon import**

At the top imports, add:

```typescript
import TableIcon from '@lucide/svelte/icons/table';
```

- [ ] **Step 2: Add nav item**

In the `navItems` array (~line 32-40), add before the Admin entry:

```typescript
{ href: '/reportes', label: 'Reportes', icon: TableIcon },
```

The array becomes:

```typescript
const navItems: NavItem[] = [
	{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
	{ href: '/facturas', label: 'Facturas', icon: FileTextIcon },
	{ href: '/pagos', label: 'Pagos', icon: CreditCardIcon },
	{ href: '/cobranzas', label: 'Cobranzas', icon: TrendingUpIcon },
	{ href: '/clientes', label: 'Clientes', icon: UsersIcon },
	{ href: '/archivos', label: 'Archivos', icon: FolderIcon },
	{ href: '/reportes', label: 'Reportes', icon: TableIcon },
	{ href: '/admin', label: 'Admin', icon: SettingsIcon, adminOnly: true }
];
```

- [ ] **Step 3: Verify** — Run `npm run dev`. Confirm "Reportes" appears in the sidebar with the table icon, between "Archivos" and "Admin". Clicking it navigates to `/reportes` (will 404 until the page is created).

---

## Task 10: Report Engine

**Files:**
- Create: `src/lib/utils/report-engine.ts`

- [ ] **Step 1: Create the report engine**

Create `src/lib/utils/report-engine.ts`:

```typescript
type Invoice = {
	invoice_date?: string | null;
	net_value?: number | null;
	gross_value?: number | null;
	spot_count?: number | null;
	client_id?: string | null;
	agency?: string | null;
	channel?: string | null;
	country?: string | null;
	[key: string]: unknown;
};

type ClientsMap = Map<string, string>;

export interface ReportConfig {
	rows: 'client' | 'agency' | 'channel';
	columns: 'none' | 'months' | 'quarters';
	metric: 'net_value' | 'gross_value' | 'spot_count';
	filters: {
		year: number;
		monthFrom?: number;
		monthTo?: number;
		clientIds?: string[];
		agencyIds?: string[];
		channels?: string[];
	};
}

export interface ReportRow {
	name: string;
	total: number;
	periods: Record<string, number>;
}

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export function getColumnHeaders(config: ReportConfig): string[] {
	if (config.columns === 'none') return [];

	const from = config.filters.monthFrom ?? 1;
	const to = config.filters.monthTo ?? 12;

	if (config.columns === 'months') {
		const headers: string[] = [];
		for (let m = from; m <= to; m++) {
			headers.push(MONTH_NAMES[m - 1]);
		}
		return headers;
	}

	if (config.columns === 'quarters') {
		const quarters = new Set<string>();
		for (let m = from; m <= to; m++) {
			const q = Math.ceil(m / 3);
			quarters.add(`Q${q}`);
		}
		return Array.from(quarters).sort();
	}

	return [];
}

export function generateReportData(
	invoices: Invoice[],
	config: ReportConfig,
	clientsMap: ClientsMap,
	agencyIdsToNames?: Map<string, string>
): ReportRow[] {
	// 1. Filter
	let filtered = invoices.filter((inv) => {
		if (!inv.invoice_date) return false;
		const date = new Date(inv.invoice_date);
		if (date.getFullYear() !== config.filters.year) return false;

		const month = date.getMonth() + 1;
		if (config.filters.monthFrom && month < config.filters.monthFrom) return false;
		if (config.filters.monthTo && month > config.filters.monthTo) return false;

		return true;
	});

	if (config.filters.clientIds && config.filters.clientIds.length > 0) {
		filtered = filtered.filter((inv) => inv.client_id && config.filters.clientIds!.includes(inv.client_id));
	}
	if (config.filters.agencyIds && config.filters.agencyIds.length > 0) {
		const agencyNames = agencyIdsToNames
			? config.filters.agencyIds.map((id) => agencyIdsToNames.get(id)).filter(Boolean)
			: config.filters.agencyIds;
		filtered = filtered.filter((inv) => inv.agency && agencyNames.includes(inv.agency));
	}
	if (config.filters.channels && config.filters.channels.length > 0) {
		filtered = filtered.filter((inv) => inv.channel && config.filters.channels!.includes(inv.channel));
	}

	// 2. Group by dimension
	const groups = new Map<string, Invoice[]>();
	for (const inv of filtered) {
		let key: string;
		if (config.rows === 'client') {
			key = (inv.client_id && clientsMap.get(inv.client_id)) || 'Sin cliente';
		} else if (config.rows === 'agency') {
			key = inv.agency || 'Directo';
		} else {
			key = inv.channel || 'Sin canal';
		}
		if (!groups.has(key)) groups.set(key, []);
		groups.get(key)!.push(inv);
	}

	// 3. Compute values
	const metricField = config.metric;
	const columnHeaders = getColumnHeaders(config);

	const rows: ReportRow[] = [];
	for (const [name, invs] of groups) {
		const periods: Record<string, number> = {};

		if (config.columns === 'none') {
			// No period breakdown
		} else {
			// Initialize all periods to 0
			for (const header of columnHeaders) {
				periods[header] = 0;
			}

			for (const inv of invs) {
				if (!inv.invoice_date) continue;
				const date = new Date(inv.invoice_date);
				const month = date.getMonth() + 1;
				let periodKey: string;

				if (config.columns === 'months') {
					periodKey = MONTH_NAMES[month - 1];
				} else {
					const q = Math.ceil(month / 3);
					periodKey = `Q${q}`;
				}

				if (periods[periodKey] !== undefined) {
					periods[periodKey] += (inv[metricField] as number) ?? 0;
				}
			}
		}

		const total = invs.reduce((sum, inv) => sum + ((inv[metricField] as number) ?? 0), 0);
		rows.push({ name, total, periods });
	}

	// 4. Sort by total descending
	rows.sort((a, b) => b.total - a.total);

	return rows;
}

export function computeReportTotals(rows: ReportRow[], columnHeaders: string[]): ReportRow {
	const periods: Record<string, number> = {};
	for (const header of columnHeaders) {
		periods[header] = rows.reduce((sum, r) => sum + (r.periods[header] ?? 0), 0);
	}
	const total = rows.reduce((sum, r) => sum + r.total, 0);
	return { name: 'Total general', total, periods };
}
```

- [ ] **Step 2: Verify** — No runtime verification needed yet; pure logic. Will be used in the report page.

---

## Task 11: Report Builder Page — Server Load

**Files:**
- Create: `src/routes/(app)/reportes/+page.server.ts`

- [ ] **Step 1: Create the server load function**

Create `src/routes/(app)/reportes/+page.server.ts` — identical to the dashboard one:

```typescript
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [invoicesRes, clientsRes, agenciesRes] = await Promise.all([
		locals.supabase.from('invoices').select('*, clients(name)').order('invoice_date', { ascending: false }),
		locals.supabase.from('clients').select('id, name, country').order('name'),
		locals.supabase.from('agencies').select('id, name, country').order('name')
	]);

	return {
		invoices: invoicesRes.data ?? [],
		clients: clientsRes.data ?? [],
		agencies: agenciesRes.data ?? []
	};
};
```

- [ ] **Step 2: Verify** — Run `npm run dev`, navigate to `/reportes`. Should load without errors (page will be empty until the UI is created).

---

## Task 12: Report Builder Page — UI

**Files:**
- Create: `src/routes/(app)/reportes/+page.svelte`

- [ ] **Step 1: Create the report builder page**

Create `src/routes/(app)/reportes/+page.svelte`:

```svelte
<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import MonthPicker from '$lib/components/dashboard/MonthPicker.svelte';
	import MultiSelect from '$lib/components/dashboard/MultiSelect.svelte';
	import AgGridSvelte from 'ag-grid-svelte5';
	import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
	import type { ColDef, GridApi } from '@ag-grid-community/core';
	import { formatCurrency, formatNumber } from '$lib/utils/currency';
	import { selectedCountry } from '$lib/stores/country';
	import { mode } from 'mode-watcher';
	import { browser } from '$app/environment';
	import {
		generateReportData,
		getColumnHeaders,
		computeReportTotals,
		type ReportConfig,
		type ReportRow
	} from '$lib/utils/report-engine';
	import { exportReportToExcel } from '$lib/utils/excel-export';
	import { Download, Save, Trash2, Table } from '@lucide/svelte';

	let { data } = $props();

	let country = $state('ar');
	selectedCountry.subscribe((v) => (country = v));

	let gridClass = $derived(mode.current === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz');

	// Report config state
	let rows = $state<'client' | 'agency' | 'channel'>('client');
	let columns = $state<'none' | 'months' | 'quarters'>('none');
	let metric = $state<'net_value' | 'gross_value' | 'spot_count'>('net_value');
	let filterYear = $state(new Date().getFullYear());
	let filterMonthFrom = $state<number>(0);  // 0 = all months
	let filterMonthTo = $state<number>(0);    // 0 = all months
	let selectedClients = $state<string[]>([]);
	let selectedAgencies = $state<string[]>([]);
	let selectedChannels = $state<string[]>([]);

	// Custom presets
	let customPresets = $state<{ name: string; config: ReportConfig }[]>([]);
	let presetName = $state('');

	if (browser) {
		try {
			const stored = localStorage.getItem('cmp-report-presets');
			if (stored) customPresets = JSON.parse(stored);
		} catch {}
	}

	function saveCustomPresets() {
		if (browser) localStorage.setItem('cmp-report-presets', JSON.stringify(customPresets));
	}

	// Country-scoped data
	const countryInvoices = $derived((data.invoices ?? []).filter((inv: any) => inv.country === country));
	const countryClients = $derived(
		(data.clients ?? []).filter((c: any) => c.country === country).map((c: any) => ({ id: c.id, name: c.name }))
	);
	const countryAgencies = $derived(
		(data.agencies ?? []).filter((a: any) => a.country === country).map((a: any) => ({ id: a.id, name: a.name }))
	);
	const channelList = $derived(() => {
		const channels = new Set<string>();
		for (const inv of countryInvoices) {
			if (inv.channel) channels.add(inv.channel);
		}
		return Array.from(channels).sort().map((c) => ({ id: c, name: c }));
	});

	const clientsMap = $derived(new Map((data.clients ?? []).map((c: any) => [c.id, c.name])));
	const agencyIdsToNames = $derived(new Map((data.agencies ?? []).map((a: any) => [a.id, a.name])));

	// Build current config
	const currentConfig = $derived((): ReportConfig => ({
		rows,
		columns,
		metric,
		filters: {
			year: filterYear,
			monthFrom: filterMonthFrom || undefined,
			monthTo: filterMonthTo || undefined,
			clientIds: selectedClients.length > 0 ? selectedClients : undefined,
			agencyIds: selectedAgencies.length > 0 ? selectedAgencies : undefined,
			channels: selectedChannels.length > 0 ? selectedChannels : undefined
		}
	}));

	// Generate report data
	const reportData = $derived(generateReportData(countryInvoices, currentConfig(), clientsMap, agencyIdsToNames));
	const columnHeaders = $derived(getColumnHeaders(currentConfig()));
	const totalsRow = $derived(computeReportTotals(reportData, columnHeaders));

	// Metric label
	const metricLabel = $derived(
		metric === 'net_value' ? 'Exhibicion Neta' : metric === 'gross_value' ? 'Exhibicion Bruta' : 'Spots'
	);
	const isCurrency = $derived(metric !== 'spot_count');

	function formatValue(value: number): string {
		if (isCurrency) return formatCurrency(value, country);
		return formatNumber(value, 0);
	}

	// AG Grid column defs
	const columnDefs = $derived((): ColDef[] => {
		const dimensionLabel = rows === 'client' ? 'Cliente' : rows === 'agency' ? 'Agencia' : 'Canal';
		const cols: ColDef[] = [
			{
				headerName: dimensionLabel,
				field: 'name',
				pinned: 'left',
				width: 250,
				sortable: true
			}
		];

		if (columns !== 'none') {
			for (const header of columnHeaders) {
				cols.push({
					headerName: header,
					field: `period_${header}`,
					width: 130,
					sortable: true,
					type: 'rightAligned',
					valueFormatter: (p) => formatValue(p.value ?? 0)
				});
			}
		}

		cols.push({
			headerName: 'Total general',
			field: 'total',
			width: 160,
			sortable: true,
			sort: 'desc',
			type: 'rightAligned',
			valueFormatter: (p) => formatValue(p.value ?? 0)
		});

		return cols;
	});

	// Transform ReportRow[] into AG Grid row data (flat objects)
	const gridRowData = $derived(
		reportData.map((row) => {
			const flat: Record<string, string | number> = { name: row.name, total: row.total };
			for (const [period, value] of Object.entries(row.periods)) {
				flat[`period_${period}`] = value;
			}
			return flat;
		})
	);

	// Pinned bottom row for totals
	const pinnedBottomRowData = $derived([
		(() => {
			const flat: Record<string, string | number> = { name: 'Total general', total: totalsRow.total };
			for (const [period, value] of Object.entries(totalsRow.periods)) {
				flat[`period_${period}`] = value;
			}
			return flat;
		})()
	]);

	// Presets
	const builtInPresets: { name: string; config: Partial<ReportConfig> }[] = [
		{ name: 'Ventas por Canal', config: { rows: 'channel', columns: 'none', metric: 'net_value' } },
		{ name: 'Ventas por Agencia', config: { rows: 'agency', columns: 'none', metric: 'net_value' } },
		{ name: 'Matriz Cliente x Mes', config: { rows: 'client', columns: 'months', metric: 'net_value' } },
		{ name: 'Matriz Canal x Mes', config: { rows: 'channel', columns: 'months', metric: 'net_value' } },
		{ name: 'Matriz Agencia x Mes', config: { rows: 'agency', columns: 'months', metric: 'net_value' } }
	];

	function applyPreset(preset: Partial<ReportConfig>) {
		if (preset.rows) rows = preset.rows;
		if (preset.columns) columns = preset.columns;
		if (preset.metric) metric = preset.metric;
		if (preset.filters) {
			if (preset.filters.year) filterYear = preset.filters.year;
			filterMonthFrom = preset.filters.monthFrom ?? 0;
			filterMonthTo = preset.filters.monthTo ?? 0;
			selectedClients = preset.filters.clientIds ?? [];
			selectedAgencies = preset.filters.agencyIds ?? [];
			selectedChannels = preset.filters.channels ?? [];
		}
	}

	function applyFullPreset(config: ReportConfig) {
		rows = config.rows;
		columns = config.columns;
		metric = config.metric;
		filterYear = config.filters.year;
		filterMonthFrom = config.filters.monthFrom ?? 0;
		filterMonthTo = config.filters.monthTo ?? 0;
		selectedClients = config.filters.clientIds ?? [];
		selectedAgencies = config.filters.agencyIds ?? [];
		selectedChannels = config.filters.channels ?? [];
	}

	function savePreset() {
		if (!presetName.trim()) return;
		customPresets = [...customPresets, { name: presetName.trim(), config: currentConfig() }];
		saveCustomPresets();
		presetName = '';
	}

	function deletePreset(index: number) {
		customPresets = customPresets.filter((_, i) => i !== index);
		saveCustomPresets();
	}

	function handleExport() {
		const dimensionLabel = rows === 'client' ? 'Cliente' : rows === 'agency' ? 'Agencia' : 'Canal';
		const allCols = [
			{ header: dimensionLabel, field: 'name' },
			...columnHeaders.map((h) => ({ header: h, field: `period_${h}` })),
			{ header: 'Total general', field: 'total' }
		];

		const exportRows = [...gridRowData, pinnedBottomRowData[0]];

		exportReportToExcel(
			{ title: 'Reporte', rows: exportRows, columns: allCols },
			`Reporte_${rows}_${filterYear}_${country.toUpperCase()}.xlsx`
		);
	}

	// Available years for filter
	const yearOptions = $derived(() => {
		const currentYear = new Date().getFullYear();
		return Array.from({ length: 6 }, (_, i) => currentYear - 5 + i);
	});

	// Month options for range filter
	const monthOptions = [
		{ value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
		{ value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
		{ value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
		{ value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' }
	];
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Reportes</h1>
			<p class="text-muted-foreground text-sm">Genera reportes personalizados</p>
		</div>
		{#if reportData.length > 0}
			<Button variant="outline" size="sm" class="h-8 gap-2" onclick={handleExport}>
				<Download class="h-4 w-4" />
				Exportar Excel
			</Button>
		{/if}
	</div>

	<!-- Presets -->
	<Card.Card>
		<Card.CardHeader class="pb-3">
			<Card.CardTitle class="text-sm font-semibold">Reportes predefinidos</Card.CardTitle>
		</Card.CardHeader>
		<Card.CardContent>
			<div class="flex flex-wrap gap-2">
				{#each builtInPresets as preset}
					<Button variant="outline" size="sm" class="h-8 text-xs" onclick={() => applyPreset(preset.config)}>
						{preset.name}
					</Button>
				{/each}
				{#each customPresets as preset, i}
					<div class="flex items-center gap-1">
						<Button variant="secondary" size="sm" class="h-8 text-xs" onclick={() => applyFullPreset(preset.config)}>
							{preset.name}
						</Button>
						<Button variant="ghost" size="sm" class="h-8 w-8 p-0" onclick={() => deletePreset(i)}>
							<Trash2 class="h-3 w-3 text-muted-foreground" />
						</Button>
					</div>
				{/each}
			</div>
		</Card.CardContent>
	</Card.Card>

	<!-- Config -->
	<Card.Card>
		<Card.CardHeader class="pb-3">
			<Card.CardTitle class="text-sm font-semibold">Configuracion del reporte</Card.CardTitle>
		</Card.CardHeader>
		<Card.CardContent class="space-y-4">
			<!-- Row 1: Dimension selectors -->
			<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
				<!-- Filas -->
				<div>
					<label class="text-xs font-medium text-muted-foreground mb-1.5 block">Filas (agrupacion)</label>
					<div class="flex gap-1">
						<Button variant={rows === 'client' ? 'default' : 'outline'} size="sm" class="h-8 text-xs flex-1" onclick={() => (rows = 'client')}>Cliente</Button>
						<Button variant={rows === 'agency' ? 'default' : 'outline'} size="sm" class="h-8 text-xs flex-1" onclick={() => (rows = 'agency')}>Agencia</Button>
						<Button variant={rows === 'channel' ? 'default' : 'outline'} size="sm" class="h-8 text-xs flex-1" onclick={() => (rows = 'channel')}>Canal</Button>
					</div>
				</div>

				<!-- Columnas -->
				<div>
					<label class="text-xs font-medium text-muted-foreground mb-1.5 block">Columnas (desglose)</label>
					<div class="flex gap-1">
						<Button variant={columns === 'none' ? 'default' : 'outline'} size="sm" class="h-8 text-xs flex-1" onclick={() => (columns = 'none')}>Ninguno</Button>
						<Button variant={columns === 'months' ? 'default' : 'outline'} size="sm" class="h-8 text-xs flex-1" onclick={() => (columns = 'months')}>Meses</Button>
						<Button variant={columns === 'quarters' ? 'default' : 'outline'} size="sm" class="h-8 text-xs flex-1" onclick={() => (columns = 'quarters')}>Trimestres</Button>
					</div>
				</div>

				<!-- Metrica -->
				<div>
					<label class="text-xs font-medium text-muted-foreground mb-1.5 block">Metrica</label>
					<div class="flex gap-1">
						<Button variant={metric === 'net_value' ? 'default' : 'outline'} size="sm" class="h-8 text-xs flex-1" onclick={() => (metric = 'net_value')}>Neto</Button>
						<Button variant={metric === 'gross_value' ? 'default' : 'outline'} size="sm" class="h-8 text-xs flex-1" onclick={() => (metric = 'gross_value')}>Bruto</Button>
						<Button variant={metric === 'spot_count' ? 'default' : 'outline'} size="sm" class="h-8 text-xs flex-1" onclick={() => (metric = 'spot_count')}>Spots</Button>
					</div>
				</div>
			</div>

			<!-- Row 2: Filters -->
			<div class="flex flex-wrap items-end gap-3">
				<!-- Year -->
				<div>
					<label class="text-xs font-medium text-muted-foreground mb-1.5 block">Ano</label>
					<select
						bind:value={filterYear}
						class="h-8 rounded-md border border-input bg-background px-3 text-xs"
					>
						{#each yearOptions() as year}
							<option value={year}>{year}</option>
						{/each}
					</select>
				</div>

				<!-- Month From -->
				<div>
					<label class="text-xs font-medium text-muted-foreground mb-1.5 block">Mes desde</label>
					<select
						bind:value={filterMonthFrom}
						class="h-8 rounded-md border border-input bg-background px-3 text-xs"
					>
						<option value={0}>Todos</option>
						{#each monthOptions as mo}
							<option value={mo.value}>{mo.label}</option>
						{/each}
					</select>
				</div>

				<!-- Month To -->
				<div>
					<label class="text-xs font-medium text-muted-foreground mb-1.5 block">Mes hasta</label>
					<select
						bind:value={filterMonthTo}
						class="h-8 rounded-md border border-input bg-background px-3 text-xs"
					>
						<option value={0}>Todos</option>
						{#each monthOptions as mo}
							<option value={mo.value}>{mo.label}</option>
						{/each}
					</select>
				</div>

				<!-- Entity filters -->
				<MultiSelect label="Clientes" items={countryClients} bind:selected={selectedClients} searchable={true} />
				<MultiSelect label="Agencias" items={countryAgencies} bind:selected={selectedAgencies} searchable={true} />
				<MultiSelect label="Canales" items={channelList()} bind:selected={selectedChannels} />
			</div>

			<!-- Save preset -->
			<div class="flex items-center gap-2 pt-2 border-t">
				<input
					bind:value={presetName}
					placeholder="Nombre del preset..."
					class="h-8 rounded-md border border-input bg-background px-3 text-xs flex-1 max-w-xs"
				/>
				<Button variant="outline" size="sm" class="h-8 gap-2 text-xs" onclick={savePreset} disabled={!presetName.trim()}>
					<Save class="h-3 w-3" />
					Guardar preset
				</Button>
			</div>
		</Card.CardContent>
	</Card.Card>

	<!-- Results -->
	<div class="rounded-xl border bg-card shadow-sm overflow-hidden">
		{#if reportData.length > 0}
			<div class="p-3 border-b bg-muted/30 flex items-center justify-between">
				<span class="text-xs text-muted-foreground">
					{reportData.length} filas &middot; {metricLabel} &middot; {filterYear}
				</span>
			</div>
			<div class={gridClass} style="height: {Math.min(reportData.length * 42 + 90, 600)}px;">
				<AgGridSvelte
					modules={[ClientSideRowModelModule]}
					columnDefs={columnDefs()}
					rowData={gridRowData}
					pinnedBottomRowData={pinnedBottomRowData}
					defaultColDef={{
						resizable: true,
						suppressMovable: true
					}}
					animateRows={false}
					suppressCellFocus={true}
				/>
			</div>
		{:else}
			<div class="flex h-[300px] items-center justify-center text-muted-foreground text-sm flex-col gap-2">
				<Table class="h-8 w-8 opacity-30" />
				<p>Configura un reporte o selecciona un preset</p>
			</div>
		{/if}
	</div>
</div>
```

- [ ] **Step 2: Verify** — Run `npm run dev`. Navigate to `/reportes`. Confirm:
  - Config panel renders with all controls
  - Built-in presets load and generate data
  - AG Grid shows the report with correct values
  - Total row appears pinned at bottom
  - Switching dimensions/columns/metrics updates reactively
  - Export to Excel works
  - Custom presets can be saved and loaded
  - Custom presets persist after page reload

---

## Summary

| Task | Description | New Files | Modified Files |
|------|-------------|-----------|----------------|
| 1 | Value mode store + toggle | 2 | 0 |
| 2 | Update groupBy functions | 0 | 1 |
| 3 | Wire value mode to dashboard | 0 | 1 |
| 4 | Wire value mode to comparison + totals row | 0 | 1 |
| 5 | Aggregate comparison chart | 1 | 1 |
| 6 | Excel export utilities | 1 | 0 |
| 7 | Dashboard export button | 0 | 1 |
| 8 | Comparison export button | 0 | 1 |
| 9 | Sidebar nav entry | 0 | 1 |
| 10 | Report engine | 1 | 0 |
| 11 | Report server load | 1 | 0 |
| 12 | Report builder UI | 1 | 0 |

**Total: 7 new files, 5 modified files, 12 tasks**
