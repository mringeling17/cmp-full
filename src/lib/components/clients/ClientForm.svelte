<script lang="ts">
	import { createClient, addEmailToClient, fetchClients } from '$lib/stores/clients';
	import { selectedCountry } from '$lib/stores/country';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { toast } from 'svelte-sonner';
	import { Plus, X, Loader2 } from '@lucide/svelte';

	let {
		open = $bindable(false),
		onCreated
	}: {
		open: boolean;
		onCreated: (clientId: string) => void;
	} = $props();

	let country = $state('ar');
	selectedCountry.subscribe((v) => (country = v));

	let name = $state('');
	let emails = $state<string[]>(['']);
	let saving = $state(false);

	function addEmailField() {
		emails = [...emails, ''];
	}

	function removeEmailField(index: number) {
		emails = emails.filter((_, i) => i !== index);
	}

	function updateEmail(index: number, value: string) {
		emails = emails.map((e, i) => (i === index ? value : e));
	}

	function resetForm() {
		name = '';
		emails = [''];
		saving = false;
	}

	async function handleSubmit() {
		if (!name.trim()) {
			toast.error('El nombre es requerido');
			return;
		}
		saving = true;
		try {
			const data = await createClient(name.trim(), country);

			// Add non-empty emails
			const validEmails = emails.filter((e) => e.trim());
			for (const email of validEmails) {
				await addEmailToClient(data.id, email.trim().toLowerCase());
			}

			await fetchClients(country);
			toast.success('Cliente creado');
			open = false;
			resetForm();
			onCreated(data.id);
		} catch (e) {
			toast.error('Error al crear cliente');
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
			<Dialog.DialogTitle>Nuevo Cliente</Dialog.DialogTitle>
			<Dialog.DialogDescription>
				Crea un nuevo cliente para {country.toUpperCase()}
			</Dialog.DialogDescription>
		</Dialog.DialogHeader>

		<div class="space-y-4 py-2">
			<div>
				<Label for="client-name" class="mb-1.5">Nombre</Label>
				<Input
					id="client-name"
					placeholder="Nombre del cliente"
					bind:value={name}
					autofocus
				/>
			</div>

			<div>
				<Label class="mb-1.5">Emails</Label>
				<div class="space-y-2">
					{#each emails as email, i (i)}
						<div class="flex items-center gap-2">
							<Input
								type="email"
								placeholder="email@ejemplo.com"
								value={email}
								oninput={(e) => updateEmail(i, e.currentTarget.value)}
							/>
							{#if emails.length > 1}
								<Button
									size="sm"
									variant="ghost"
									class="shrink-0"
									onclick={() => removeEmailField(i)}
								>
									<X class="size-4" />
								</Button>
							{/if}
						</div>
					{/each}
					<Button size="sm" variant="outline" onclick={addEmailField}>
						<Plus class="mr-1 size-3.5" />
						Agregar email
					</Button>
				</div>
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
				Crear cliente
			</Button>
		</Dialog.DialogFooter>
	</Dialog.DialogContent>
</Dialog.Dialog>
