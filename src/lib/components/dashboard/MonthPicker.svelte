<script lang="ts">
	const MONTHS = [
		'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
		'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
	];

	let {
		value = $bindable(''),
		id = ''
	}: {
		value: string;
		id?: string;
	} = $props();

	// Parse YYYY-MM
	let selectedYear = $state(0);
	let selectedMonth = $state(0);

	$effect(() => {
		if (value) {
			const [y, m] = value.split('-').map(Number);
			selectedYear = y;
			selectedMonth = m;
		}
	});

	function updateValue() {
		if (selectedYear && selectedMonth) {
			value = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
		}
	}

	// Generate year options (5 years back, 1 year forward)
	const currentYear = new Date().getFullYear();
	const years = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);
</script>

<div class="flex items-center gap-1" {id}>
	<select
		class="h-9 rounded-md border border-input bg-background px-2 text-xs shadow-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
		bind:value={selectedMonth}
		onchange={updateValue}
	>
		{#each MONTHS as name, i}
			<option value={i + 1}>{name.substring(0, 3)}</option>
		{/each}
	</select>
	<select
		class="h-9 rounded-md border border-input bg-background px-2 text-xs shadow-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
		bind:value={selectedYear}
		onchange={updateValue}
	>
		{#each years as y}
			<option value={y}>{y}</option>
		{/each}
	</select>
</div>
