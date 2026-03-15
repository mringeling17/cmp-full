<script lang="ts">
	import {
		clientsList,
		updateClient,
		addEmailToClient,
		removeEmailFromClient,
		deleteClient,
		fetchClients
	} from '$lib/stores/clients';
	import { agenciesList } from '$lib/stores/agencies';
	import { selectedCountry } from '$lib/stores/country';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { toast } from 'svelte-sonner';
	import { Pencil, X, Plus, Trash2, Check, Building2, Mail } from '@lucide/svelte';

	let {
		clientId,
		onDeleted
	}: {
		clientId: string;
		onDeleted: () => void;
	} = $props();

	let country = $state('ar');
	selectedCountry.subscribe((v) => (country = v));

	const client = $derived($clientsList.find((c) => c.id === clientId));
	const agencies = $derived($agenciesList);

	// Editing name
	let editingName = $state(false);
	let editName = $state('');

	// New email
	let newEmail = $state('');
	let addingEmail = $state(false);

	// Deleting
	let confirmDelete = $state(false);

	function startEditName() {
		if (!client) return;
		editName = client.name;
		editingName = true;
	}

	async function saveName() {
		if (!client || !editName.trim()) return;
		try {
			await updateClient(client.id, { name: editName.trim() });
			await fetchClients(country);
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

	async function handleAddEmail() {
		if (!client || !newEmail.trim()) return;
		addingEmail = true;
		try {
			await addEmailToClient(client.id, newEmail.trim().toLowerCase());
			await fetchClients(country);
			newEmail = '';
			toast.success('Email agregado');
		} catch (e) {
			toast.error('Error al agregar email');
		} finally {
			addingEmail = false;
		}
	}

	async function handleRemoveEmail(email: string) {
		if (!client) return;
		try {
			await removeEmailFromClient(client.id, email);
			await fetchClients(country);
			toast.success('Email eliminado');
		} catch (e) {
			toast.error('Error al eliminar email');
		}
	}

	async function handleAgencyChange(agencyId: string) {
		if (!client) return;
		try {
			const value = agencyId === '__none__' ? null : agencyId;
			await updateClient(client.id, { agency_id: value });
			await fetchClients(country);
			toast.success('Agencia actualizada');
		} catch (e) {
			toast.error('Error al actualizar agencia');
		}
	}

	async function handleDelete() {
		if (!client) return;
		try {
			await deleteClient(client.id);
			await fetchClients(country);
			toast.success('Cliente eliminado');
			onDeleted();
		} catch (e) {
			toast.error('Error al eliminar cliente');
		}
	}

	function handleEmailKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') handleAddEmail();
	}

	const currentAgencyValue = $derived(client?.agency_id ?? '__none__');
	const currentAgencyLabel = $derived(
		client?.agency_id
			? agencies.find((a) => a.id === client.agency_id)?.name ?? 'Sin agencia'
			: 'Sin agencia'
	);
</script>

{#if client}
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
					<h2 class="text-xl font-semibold">{client.name}</h2>
					<Button size="sm" variant="ghost" onclick={startEditName}>
						<Pencil class="size-3.5" />
					</Button>
				</div>
			{/if}
			<Badge variant="outline" class="mt-1">{country.toUpperCase()}</Badge>
		</div>

		<Separator />

		<!-- Agency Section -->
		<div class="my-4">
			<Label class="mb-2 flex items-center gap-1.5 text-sm font-medium">
				<Building2 class="size-4" />
				Agencia
			</Label>
			<Select.Select
				type="single"
				value={currentAgencyValue}
				onValueChange={(v) => handleAgencyChange(v)}
			>
				<Select.SelectTrigger class="w-full">
					{currentAgencyLabel}
				</Select.SelectTrigger>
				<Select.SelectContent>
					<Select.SelectItem value="__none__" label="Sin agencia">
						Sin agencia
					</Select.SelectItem>
					{#each agencies as agency (agency.id)}
						<Select.SelectItem value={agency.id} label={agency.name}>
							{agency.name}
						</Select.SelectItem>
					{/each}
				</Select.SelectContent>
			</Select.Select>
		</div>

		<Separator />

		<!-- Emails Section -->
		<div class="my-4 flex-1">
			<Label class="mb-2 flex items-center gap-1.5 text-sm font-medium">
				<Mail class="size-4" />
				Emails
			</Label>

			<div class="space-y-2">
				{#each client.emails as email (email)}
					<div
						class="bg-muted flex items-center justify-between rounded-md px-3 py-1.5 text-sm"
					>
						<span>{email}</span>
						<Button
							size="sm"
							variant="ghost"
							class="text-destructive h-auto p-1"
							onclick={() => handleRemoveEmail(email)}
						>
							<X class="size-3.5" />
						</Button>
					</div>
				{/each}

				{#if client.emails.length === 0}
					<p class="text-muted-foreground text-sm">No hay emails asignados</p>
				{/if}

				<div class="flex items-center gap-2 pt-1">
					<Input
						type="email"
						placeholder="nuevo@email.com"
						bind:value={newEmail}
						onkeydown={handleEmailKeydown}
					/>
					<Button
						size="sm"
						onclick={handleAddEmail}
						disabled={addingEmail || !newEmail.trim()}
					>
						<Plus class="size-4" />
					</Button>
				</div>
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
					Eliminar cliente
				</Button>
			{/if}
		</div>
	</div>
{/if}
