<script lang="ts">
	import { createAgency, fetchAgencies } from '$lib/stores/agencies';
	import { selectedCountry } from '$lib/stores/country';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { toast } from 'svelte-sonner';
	import { Loader2 } from '@lucide/svelte';

	let {
		open = $bindable(false),
		onCreated
	}: {
		open: boolean;
		onCreated: (agencyId: string) => void;
	} = $props();

	let country = $state('ar');
	selectedCountry.subscribe((v) => (country = v));

	let name = $state('');
	let saving = $state(false);

	function resetForm() {
		name = '';
		saving = false;
	}

	async function handleSubmit() {
		if (!name.trim()) {
			toast.error('El nombre es requerido');
			return;
		}
		saving = true;
		try {
			const data = await createAgency(name.trim(), country);
			await fetchAgencies(country);
			toast.success('Agencia creada');
			open = false;
			resetForm();
			onCreated(data.id);
		} catch (e) {
			toast.error('Error al crear agencia');
		} finally {
			saving = false;
		}
	}

	function handleOpenChange(isOpen: boolean) {
		open = isOpen;
		if (!isOpen) resetForm();
	}
</script>

<Dialog.Dialog {open} onOpenChange={handleOpenChange}>
	<Dialog.DialogContent class="sm:max-w-md">
		<Dialog.DialogHeader>
			<Dialog.DialogTitle>Nueva Agencia</Dialog.DialogTitle>
			<Dialog.DialogDescription>
				Crea una nueva agencia para {country.toUpperCase()}
			</Dialog.DialogDescription>
		</Dialog.DialogHeader>

		<div class="space-y-4 py-2">
			<div>
				<Label for="agency-name" class="mb-1.5">Nombre</Label>
				<Input
					id="agency-name"
					placeholder="Nombre de la agencia"
					bind:value={name}
					autofocus
				/>
			</div>
		</div>

		<Dialog.DialogFooter>
			<Button variant="outline" onclick={() => handleOpenChange(false)} disabled={saving}>
				Cancelar
			</Button>
			<Button onclick={handleSubmit} disabled={saving || !name.trim()}>
				{#if saving}
					<Loader2 class="mr-2 size-4 animate-spin" />
				{/if}
				Crear agencia
			</Button>
		</Dialog.DialogFooter>
	</Dialog.DialogContent>
</Dialog.Dialog>
