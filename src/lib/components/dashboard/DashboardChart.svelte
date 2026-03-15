<script lang="ts">
	import { onMount } from 'svelte';
	import * as echarts from 'echarts';
	import type { EChartsOption } from 'echarts';
	import { mode } from 'mode-watcher';

	let { options, height = '300px' }: { options: EChartsOption; height?: string } = $props();

	let chartContainer: HTMLDivElement;
	let chart: echarts.ECharts | null = null;

	let currentMode = $derived(mode.current);

	function getThemeColors(dark: boolean) {
		return {
			backgroundColor: 'transparent',
			textStyle: {
				color: dark ? '#e5e7eb' : '#374151'
			}
		};
	}

	onMount(() => {
		const dark = currentMode === 'dark';
		chart = echarts.init(chartContainer, dark ? 'dark' : undefined);
		chart.setOption({
			...getThemeColors(dark),
			...options
		});

		const handleResize = () => chart?.resize();
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
			chart?.dispose();
			chart = null;
		};
	});

	// React to mode changes: reinitialize chart with correct theme
	$effect(() => {
		const dark = currentMode === 'dark';
		if (chart && chartContainer) {
			chart.dispose();
			chart = echarts.init(chartContainer, dark ? 'dark' : undefined);
			chart.setOption({
				...getThemeColors(dark),
				...options
			});
		}
	});

	// React to options changes
	$effect(() => {
		if (chart && options) {
			const dark = currentMode === 'dark';
			chart.setOption(
				{
					...getThemeColors(dark),
					...options
				},
				true
			);
		}
	});
</script>

<div bind:this={chartContainer} style="width: 100%; height: {height}"></div>
