<script lang="ts">
	import {
		selectedCountry,
		allCountries,
		type CountryCode
	} from '$lib/stores/country';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';

	let currentCountry = $derived(allCountries.find((c) => c.code === $selectedCountry)!);

	function selectCountry(code: CountryCode) {
		selectedCountry.set(code);
	}
</script>

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
		{#each allCountries as country (country.code)}
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
