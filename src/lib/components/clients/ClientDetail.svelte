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
	import {
		clientAgencyPeriods,
		fetchClientAgencyPeriods,
		createClientAgencyPeriod,
		updateClientAgencyPeriod,
		deleteClientAgencyPeriod
	} from '$lib/stores/client-agency-periods';
	import { selectedCountry } from '$lib/stores/country';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { toast } from 'svelte-sonner';
	import { Pencil, X, Plus, Trash2, Check, Building2, Mail, Calendar } from '@lucide/svelte';

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
	const periods = $derived($clientAgencyPeriods);

	// Load periods when clientId changes
	$effect(() => {
		if (clientId) {
			fetchClientAgencyPeriods(clientId);
		}
	});

	// Editing name
	let editingName = $state(false);
	let editName = $state('');

	// New email
	let newEmail = $state('');
	let addingEmail = $state(false);

	// Deleting
	let confirmDelete = $state(false);

	// Agency period dialog
	let showPeriodDialog = $state(false);
	let periodAgencyId = $state('');
	let periodStartDate = $state('');
	let periodEndDate = $state('');
	let editingPeriodId = $state<string | null>(null);
	let savingPeriod = $state(false);

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
		} catch {
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
		} catch {
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
		} catch {
			toast.error('Error al eliminar email');
		}
	}

	async function handleDelete() {
		if (!client) return;
		try {
			await deleteClient(client.id);
			await fetchClients(country);
			toast.success('Cliente eliminado');
			onDeleted();
		} catch {
			toast.error('Error al eliminar cliente');
		}
	}

	function handleEmailKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') handleAddEmail();
	}

	// Agency period handlers
	function openAddPeriod() {
		editingPeriodId = null;
		periodAgencyId = '';
		periodStartDate = '';
		periodEndDate = '';
		showPeriodDialog = true;
	}

	function openEditPeriod(period: { id: string; agency_id: string; start_date: string; end_date: string | null }) {
		editingPeriodId = period.id;
		periodAgencyId = period.agency_id;
		periodStartDate = period.start_date;
		periodEndDate = period.end_date ?? '';
		showPeriodDialog = true;
	}

	async function savePeriod() {
		if (!client || !periodAgencyId || !periodStartDate) return;
		savingPeriod = true;
		try {
			const endDate = periodEndDate || null;
			if (editingPeriodId) {
				await updateClientAgencyPeriod(editingPeriodId, client.id, {
					agency_id: periodAgencyId,
					start_date: periodStartDate,
					end_date: endDate
				});
				toast.success('Período actualizado');
			} else {
				await createClientAgencyPeriod({
					client_id: client.id,
					agency_id: periodAgencyId,
					start_date: periodStartDate,
					end_date: endDate
				});
				toast.success('Período creado');
			}
			await fetchClientAgencyPeriods(client.id);
			showPeriodDialog = false;
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Error al guardar período');
		} finally {
			savingPeriod = false;
		}
	}

	async function handleDeletePeriod(periodId: string) {
		if (!client) return;
		try {
			await deleteClientAgencyPeriod(periodId);
			await fetchClientAgencyPeriods(client.id);
			toast.success('Período eliminado');
		} catch {
			toast.error('Error al eliminar período');
		}
	}

	function getAgencyName(agencyId: string): string {
		return agencies.find((a) => a.id === agencyId)?.name ?? 'Desconocida';
	}
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

		<!-- Agency Periods Section -->
		<div class="my-4">
			<div class="mb-2 flex items-center justify-between">
				<Label class="flex items-center gap-1.5 text-sm font-medium">
					<Building2 class="size-4" />
					Agencias
				</Label>
				<Button size="sm" variant="outline" class="h-7 text-xs" onclick={openAddPeriod}>
					<Plus class="mr-1 size-3" />
					Agregar
				</Button>
			</div>

			{#if periods.length === 0}
				<p class="text-muted-foreground text-sm">No hay agencias asignadas</p>
			{:else}
				<div class="space-y-2">
					{#each periods as period (period.id)}
						<div class="bg-muted flex items-center justify-between rounded-md px-3 py-2 text-sm">
							<div class="flex flex-col gap-0.5">
								<span class="font-medium">{getAgencyName(period.agency_id)}</span>
								<span class="text-muted-foreground flex items-center gap-1 text-xs">
									<Calendar class="size-3" />
									{period.start_date}
									→
									{#if period.end_date}
										{period.end_date}
									{:else}
										<Badge variant="secondary" class="h-4 text-[10px]">Vigente</Badge>
									{/if}
								</span>
							</div>
							<div class="flex items-center gap-1">
								<Button
									size="sm"
									variant="ghost"
									class="h-auto p-1"
									onclick={() => openEditPeriod(period)}
								>
									<Pencil class="size-3" />
								</Button>
								<Button
									size="sm"
									variant="ghost"
									class="text-destructive h-auto p-1"
									onclick={() => handleDeletePeriod(period.id)}
								>
									<X class="size-3.5" />
								</Button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
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

	<!-- Period Dialog -->
	<Dialog.Root bind:open={showPeriodDialog}>
		<Dialog.Content class="sm:max-w-md">
			<Dialog.Header>
				<Dialog.Title>{editingPeriodId ? 'Editar' : 'Agregar'} período de agencia</Dialog.Title>
			</Dialog.Header>
			<div class="space-y-4 py-4">
				<div>
					<Label class="mb-1.5 text-sm">Agencia</Label>
					<Select.Select
						type="single"
						value={periodAgencyId}
						onValueChange={(v) => (periodAgencyId = v)}
					>
						<Select.SelectTrigger class="w-full">
							{periodAgencyId ? getAgencyName(periodAgencyId) : 'Seleccionar agencia'}
						</Select.SelectTrigger>
						<Select.SelectContent>
							{#each agencies as agency (agency.id)}
								<Select.SelectItem value={agency.id} label={agency.name}>
									{agency.name}
								</Select.SelectItem>
							{/each}
						</Select.SelectContent>
					</Select.Select>
				</div>
				<div>
					<Label class="mb-1.5 text-sm">Fecha inicio</Label>
					<Input type="date" bind:value={periodStartDate} />
				</div>
				<div>
					<Label class="mb-1.5 text-sm">Fecha fin (dejar vacío = vigente)</Label>
					<Input type="date" bind:value={periodEndDate} />
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (showPeriodDialog = false)}>Cancelar</Button>
				<Button
					onclick={savePeriod}
					disabled={savingPeriod || !periodAgencyId || !periodStartDate}
				>
					{editingPeriodId ? 'Guardar' : 'Crear'}
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
{/if}
