<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import type { Component } from 'svelte';

	let {
		title,
		value,
		trend = undefined,
		icon: Icon = undefined,
		class: className = ''
	}: {
		title: string;
		value: string;
		trend?: number | null;
		icon?: Component | undefined;
		class?: string;
	} = $props();

	const trendColor = $derived(
		trend != null ? (trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400') : ''
	);
	const trendIcon = $derived(trend != null ? (trend >= 0 ? '+' : '') : '');
</script>

<Card.Card class="relative overflow-hidden {className}">
	<Card.CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
		<Card.CardTitle class="text-sm font-medium text-muted-foreground">{title}</Card.CardTitle>
		{#if Icon}
			<div class="text-muted-foreground">
				<Icon class="h-4 w-4" />
			</div>
		{/if}
	</Card.CardHeader>
	<Card.CardContent>
		<div class="font-bold" class:text-lg={value.length > 14} class:text-xl={value.length <= 14 && value.length > 10} class:text-2xl={value.length <= 10} title={value}>{value}</div>
		{#if trend != null}
			<p class="text-xs {trendColor} mt-1">
				{trendIcon}{trend.toFixed(1)}% vs mismo periodo año anterior
			</p>
		{/if}
	</Card.CardContent>
</Card.Card>
