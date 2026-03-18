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
