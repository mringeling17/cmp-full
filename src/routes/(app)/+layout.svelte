<script lang="ts">
	import { navigating, page } from '$app/stores';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { selectedCountry, type CountryCode } from '$lib/stores/country';
	import 'ag-grid-community/styles/ag-grid.css';
	import 'ag-grid-community/styles/ag-theme-quartz.css';

	let { children } = $props();

	// Enforce allowed country on every navigation
	$effect(() => {
		const allowed = $page.data.allowedCountries as string[] | null;
		if (allowed && allowed.length > 0 && !allowed.includes($selectedCountry)) {
			selectedCountry.set(allowed[0] as CountryCode);
		}
	});
</script>

{#if $navigating}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
		<div class="flex flex-col items-center gap-3">
			<div class="h-8 w-8 animate-spin rounded-full border-4 border-muted-foreground/30 border-t-primary"></div>
			<span class="text-sm text-muted-foreground">Cargando...</span>
		</div>
	</div>
{/if}

<div class="flex h-screen">
	<Sidebar />
	<main class="flex-1 overflow-auto">
		<!-- Spacer for mobile header -->
		<div class="h-14 lg:hidden"></div>
		<div class="p-6">
			{@render children()}
		</div>
	</main>
</div>
