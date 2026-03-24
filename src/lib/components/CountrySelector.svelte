<script lang="ts">
	import { page } from '$app/stores';
	import {
		selectedCountry,
		allCountries,
		type CountryCode
	} from '$lib/stores/country';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';

	const allowedCountries = $derived($page.data.allowedCountries as string[] | null);

	const availableCountries = $derived(
		allowedCountries
			? allCountries.filter((c) => allowedCountries.includes(c.code))
			: allCountries
	);

	let currentCountry = $derived(allCountries.find((c) => c.code === $selectedCountry)!);

	// Auto-switch if current selection is not in allowed list
	$effect(() => {
		if (allowedCountries && !allowedCountries.includes($selectedCountry) && availableCountries.length > 0) {
			selectedCountry.set(availableCountries[0].code);
		}
	});

	function selectCountry(code: CountryCode) {
		selectedCountry.set(code);
	}
</script>

{#if availableCountries.length === 1}
	<!-- Single country: show static display -->
	<div class="flex w-full items-center gap-2 px-3 py-2">
		<span class="text-base">{availableCountries[0].flag}</span>
		<span class="text-sm">{availableCountries[0].name}</span>
	</div>
{:else if availableCountries.length > 1}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button variant="ghost" class="w-full justify-between gap-2 px-3" {...props}>
					<span class="flex items-center gap-2">
						<span class="text-base">{currentCountry.flag}</span>
						<span class="text-sm">{currentCountry.name}</span>
					</span>
					<ChevronDownIcon class="size-4 opacity-50" />
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content class="w-48" align="start">
			{#each availableCountries as country (country.code)}
				<DropdownMenu.Item
					onclick={() => selectCountry(country.code)}
					class={$selectedCountry === country.code ? 'bg-accent' : ''}
				>
					<span class="text-base">{country.flag}</span>
					<span>{country.name}</span>
					<span class="ml-auto text-xs text-muted-foreground">{country.currency}</span>
				</DropdownMenu.Item>
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/if}
