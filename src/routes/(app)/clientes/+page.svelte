<script lang="ts">
	import { selectedCountry } from '$lib/stores/country';
	import { fetchClients } from '$lib/stores/clients';
	import { fetchAgencies } from '$lib/stores/agencies';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import ClientList from '$lib/components/clients/ClientList.svelte';
	import ClientDetail from '$lib/components/clients/ClientDetail.svelte';
	import ClientForm from '$lib/components/clients/ClientForm.svelte';
	import AgencyList from '$lib/components/agencies/AgencyList.svelte';
	import AgencyDetail from '$lib/components/agencies/AgencyDetail.svelte';
	import AgencyForm from '$lib/components/agencies/AgencyForm.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ArrowLeft } from '@lucide/svelte';

	// Active tab
	let activeTab = $state('clientes');

	// Selection state
	let selectedClientId = $state<string | null>(null);
	let selectedAgencyId = $state<string | null>(null);

	// Dialog state
	let clientFormOpen = $state(false);
	let agencyFormOpen = $state(false);

	// Country tracking
	let country = $state('ar');
	selectedCountry.subscribe((v) => (country = v));

	// Load data on country change
	$effect(() => {
		const c = country;
		selectedClientId = null;
		selectedAgencyId = null;
		fetchClients(c);
		fetchAgencies(c);
	});

	// Reset selections on tab change
	function handleTabChange(value: string) {
		activeTab = value;
	}

	// Mobile: whether detail is showing
	const showClientDetail = $derived(selectedClientId !== null);
	const showAgencyDetail = $derived(selectedAgencyId !== null);
</script>

<div class="flex h-[calc(100vh-7rem)] flex-col lg:h-[calc(100vh-5rem)]">
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-2xl font-bold">Clientes</h1>
	</div>

	<!-- Tabs -->
	<Tabs.Tabs value={activeTab} onValueChange={handleTabChange}>
		<Tabs.TabsList class="mb-4">
			<Tabs.TabsTrigger value="clientes">Clientes</Tabs.TabsTrigger>
			<Tabs.TabsTrigger value="agencias">Agencias</Tabs.TabsTrigger>
		</Tabs.TabsList>

		<Tabs.TabsContent value="clientes" class="mt-0 flex-1">
			<div class="flex h-[calc(100vh-14rem)] overflow-hidden rounded-lg border lg:h-[calc(100vh-12rem)]">
				<!-- Client List -->
				<div
					class="w-full shrink-0 border-r md:w-80 lg:w-96 {showClientDetail
						? 'hidden md:block'
						: ''}"
				>
					<ClientList
						bind:selectedId={selectedClientId}
						onCreateClick={() => (clientFormOpen = true)}
					/>
				</div>

				<!-- Client Detail -->
				<div
					class="min-w-0 flex-1 {showClientDetail ? '' : 'hidden md:block'}"
				>
					{#if selectedClientId}
						<!-- Mobile back button -->
						<div class="border-b p-2 md:hidden">
							<Button
								size="sm"
								variant="ghost"
								onclick={() => (selectedClientId = null)}
							>
								<ArrowLeft class="mr-1 size-4" />
								Volver
							</Button>
						</div>
						<ClientDetail
							clientId={selectedClientId}
							onDeleted={() => (selectedClientId = null)}
						/>
					{:else}
						<div
							class="text-muted-foreground flex h-full items-center justify-center text-sm"
						>
							Selecciona un cliente para ver sus detalles
						</div>
					{/if}
				</div>
			</div>
		</Tabs.TabsContent>

		<Tabs.TabsContent value="agencias" class="mt-0 flex-1">
			<div class="flex h-[calc(100vh-14rem)] overflow-hidden rounded-lg border lg:h-[calc(100vh-12rem)]">
				<!-- Agency List -->
				<div
					class="w-full shrink-0 border-r md:w-80 lg:w-96 {showAgencyDetail
						? 'hidden md:block'
						: ''}"
				>
					<AgencyList
						bind:selectedId={selectedAgencyId}
						onCreateClick={() => (agencyFormOpen = true)}
					/>
				</div>

				<!-- Agency Detail -->
				<div
					class="min-w-0 flex-1 {showAgencyDetail ? '' : 'hidden md:block'}"
				>
					{#if selectedAgencyId}
						<!-- Mobile back button -->
						<div class="border-b p-2 md:hidden">
							<Button
								size="sm"
								variant="ghost"
								onclick={() => (selectedAgencyId = null)}
							>
								<ArrowLeft class="mr-1 size-4" />
								Volver
							</Button>
						</div>
						<AgencyDetail
							agencyId={selectedAgencyId}
							onDeleted={() => (selectedAgencyId = null)}
						/>
					{:else}
						<div
							class="text-muted-foreground flex h-full items-center justify-center text-sm"
						>
							Selecciona una agencia para ver sus detalles
						</div>
					{/if}
				</div>
			</div>
		</Tabs.TabsContent>
	</Tabs.Tabs>

	<!-- Dialogs -->
	<ClientForm
		bind:open={clientFormOpen}
		onCreated={(id) => (selectedClientId = id)}
	/>
	<AgencyForm
		bind:open={agencyFormOpen}
		onCreated={(id) => (selectedAgencyId = id)}
	/>
</div>
