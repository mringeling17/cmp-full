<script lang="ts">
	import {
		agenciesList,
		updateAgency,
		deleteAgency,
		addAgencyContact,
		removeAgencyContact,
		fetchAgencies
	} from '$lib/stores/agencies';
	import { selectedCountry } from '$lib/stores/country';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { toast } from 'svelte-sonner';
	import {
		Pencil,
		X,
		Plus,
		Trash2,
		Check,
		Users,
		Receipt,
		Phone,
		Smartphone,
		Mail
	} from '@lucide/svelte';

	let {
		agencyId,
		onDeleted
	}: {
		agencyId: string;
		onDeleted: () => void;
	} = $props();

	let country = $state('ar');
	selectedCountry.subscribe((v) => (country = v));

	const agency = $derived($agenciesList.find((a) => a.id === agencyId));

	// Editing name
	let editingName = $state(false);
	let editName = $state('');

	// New contact
	let showContactForm = $state(false);
	let newContact = $state({
		name: '',
		email: '',
		phone: '',
		mobile: '',
		position: '',
		is_primary: false
	});

	// Deleting
	let confirmDelete = $state(false);

	function startEditName() {
		if (!agency) return;
		editName = agency.name;
		editingName = true;
	}

	async function saveName() {
		if (!agency || !editName.trim()) return;
		try {
			await updateAgency(agency.id, { name: editName.trim() });
			await fetchAgencies(country);
			editingName = false;
			toast.success('Nombre actualizado');
		} catch (e) {
			toast.error('Error al actualizar nombre');
		}
	}

	function handleNameKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') saveName();
		if (e.key === 'Escape') {
			editingName = false;
		}
	}

	async function toggleCreditNote() {
		if (!agency) return;
		try {
			await updateAgency(agency.id, { receives_credit_note: !agency.receives_credit_note });
			await fetchAgencies(country);
			toast.success('Nota de credito actualizada');
		} catch (e) {
			toast.error('Error al actualizar');
		}
	}

	function resetContactForm() {
		newContact = {
			name: '',
			email: '',
			phone: '',
			mobile: '',
			position: '',
			is_primary: false
		};
		showContactForm = false;
	}

	async function handleAddContact() {
		if (!agency || !newContact.name.trim()) {
			toast.error('El nombre del contacto es requerido');
			return;
		}
		try {
			await addAgencyContact(agency.id, {
				name: newContact.name.trim(),
				email: newContact.email.trim() || undefined,
				phone: newContact.phone.trim() || undefined,
				mobile: newContact.mobile.trim() || undefined,
				position: newContact.position.trim() || undefined,
				is_primary: newContact.is_primary
			});
			await fetchAgencies(country);
			resetContactForm();
			toast.success('Contacto agregado');
		} catch (e) {
			toast.error('Error al agregar contacto');
		}
	}

	async function handleRemoveContact(contactId: string) {
		try {
			await removeAgencyContact(contactId);
			await fetchAgencies(country);
			toast.success('Contacto eliminado');
		} catch (e) {
			toast.error('Error al eliminar contacto');
		}
	}

	async function handleDelete() {
		if (!agency) return;
		try {
			await deleteAgency(agency.id);
			await fetchAgencies(country);
			toast.success('Agencia eliminada');
			onDeleted();
		} catch (e) {
			toast.error('Error al eliminar agencia');
		}
	}
</script>

{#if agency}
	<div class="flex h-full flex-col p-4">
		<!-- Name Section -->
		<div class="mb-4">
			{#if editingName}
				<div class="flex items-center gap-2">
					<Input
						bind:value={editName}
						onkeydown={handleNameKeydown}
						class="text-lg font-semibold"
						autofocus
					/>
					<Button size="sm" variant="ghost" onclick={saveName}>
						<Check class="size-4" />
					</Button>
					<Button size="sm" variant="ghost" onclick={() => (editingName = false)}>
						<X class="size-4" />
					</Button>
				</div>
			{:else}
				<div class="flex items-center gap-2">
					<h2 class="text-xl font-semibold">{agency.name}</h2>
					<Button size="sm" variant="ghost" onclick={startEditName}>
						<Pencil class="size-3.5" />
					</Button>
				</div>
			{/if}
			<div class="mt-1 flex items-center gap-2">
				<Badge variant="outline">{country.toUpperCase()}</Badge>
			</div>
		</div>

		<Separator />

		<!-- Credit Note Toggle -->
		<div class="my-4">
			<Label class="mb-2 flex items-center gap-1.5 text-sm font-medium">
				<Receipt class="size-4" />
				Nota de Credito
			</Label>
			<button
				class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent"
				onclick={toggleCreditNote}
			>
				<div
					class="flex h-5 w-9 items-center rounded-full px-0.5 transition-colors {agency.receives_credit_note
						? 'bg-primary'
						: 'bg-muted'}"
				>
					<div
						class="size-4 rounded-full bg-white shadow transition-transform {agency.receives_credit_note
							? 'translate-x-4'
							: 'translate-x-0'}"
					></div>
				</div>
				<span class="text-muted-foreground">
					{agency.receives_credit_note ? 'Recibe nota de credito' : 'No recibe nota de credito'}
				</span>
			</button>
		</div>

		<Separator />

		<!-- Contacts Section -->
		<div class="my-4 flex-1">
			<div class="mb-2 flex items-center justify-between">
				<Label class="flex items-center gap-1.5 text-sm font-medium">
					<Users class="size-4" />
					Contactos ({agency.contacts.length})
				</Label>
				{#if !showContactForm}
					<Button size="sm" variant="outline" onclick={() => (showContactForm = true)}>
						<Plus class="mr-1 size-3.5" />
						Agregar
					</Button>
				{/if}
			</div>

			{#if showContactForm}
				<div class="bg-muted/50 mb-3 space-y-2 rounded-lg border p-3">
					<Input placeholder="Nombre *" bind:value={newContact.name} />
					<Input type="email" placeholder="Email" bind:value={newContact.email} />
					<div class="grid grid-cols-2 gap-2">
						<Input placeholder="Telefono" bind:value={newContact.phone} />
						<Input placeholder="Celular" bind:value={newContact.mobile} />
					</div>
					<Input placeholder="Cargo" bind:value={newContact.position} />
					<label class="flex items-center gap-2 text-sm">
						<input type="checkbox" bind:checked={newContact.is_primary} />
						Contacto principal
					</label>
					<div class="flex gap-2">
						<Button size="sm" onclick={handleAddContact} disabled={!newContact.name.trim()}>
							Guardar
						</Button>
						<Button size="sm" variant="outline" onclick={resetContactForm}>
							Cancelar
						</Button>
					</div>
				</div>
			{/if}

			<div class="space-y-2">
				{#each agency.contacts as contact (contact.id)}
					<div class="rounded-lg border p-3">
						<div class="flex items-start justify-between">
							<div>
								<div class="flex items-center gap-2">
									<span class="text-sm font-medium">{contact.name}</span>
									{#if contact.is_primary}
										<Badge variant="default" class="text-[10px]">Principal</Badge>
									{/if}
								</div>
								{#if contact.position}
									<p class="text-muted-foreground text-xs">{contact.position}</p>
								{/if}
								<div class="mt-1 space-y-0.5">
									{#if contact.email}
										<div class="text-muted-foreground flex items-center gap-1 text-xs">
											<Mail class="size-3" />
											{contact.email}
										</div>
									{/if}
									{#if contact.phone}
										<div class="text-muted-foreground flex items-center gap-1 text-xs">
											<Phone class="size-3" />
											{contact.phone}
										</div>
									{/if}
									{#if contact.mobile}
										<div class="text-muted-foreground flex items-center gap-1 text-xs">
											<Smartphone class="size-3" />
											{contact.mobile}
										</div>
									{/if}
								</div>
							</div>
							<Button
								size="sm"
								variant="ghost"
								class="text-destructive h-auto p-1"
								onclick={() => handleRemoveContact(contact.id)}
							>
								<X class="size-3.5" />
							</Button>
						</div>
					</div>
				{/each}

				{#if agency.contacts.length === 0 && !showContactForm}
					<p class="text-muted-foreground text-sm">No hay contactos</p>
				{/if}
			</div>
		</div>

		<Separator />

		<!-- Delete Section -->
		<div class="mt-4">
			{#if confirmDelete}
				<div class="flex items-center gap-2">
					<span class="text-destructive text-sm">Confirmar eliminacion?</span>
					<Button size="sm" variant="destructive" onclick={handleDelete}>
						Eliminar
					</Button>
					<Button size="sm" variant="outline" onclick={() => (confirmDelete = false)}>
						Cancelar
					</Button>
				</div>
			{:else}
				<Button
					size="sm"
					variant="outline"
					class="text-destructive"
					onclick={() => (confirmDelete = true)}
				>
					<Trash2 class="mr-1 size-3.5" />
					Eliminar agencia
				</Button>
			{/if}
		</div>
	</div>
{/if}
