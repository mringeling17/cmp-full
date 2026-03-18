<script lang="ts">
	import { valueMode } from '$lib/stores/value-mode';
	import { Button } from '$lib/components/ui/button/index.js';

	let mode = $state<'net' | 'gross'>('net');
	valueMode.subscribe((v) => (mode = v));
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
