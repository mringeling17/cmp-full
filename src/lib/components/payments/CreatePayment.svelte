<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import PaymentAllocation from './PaymentAllocation.svelte';
	import type { AllocationInvoice, AllocationRow } from './PaymentAllocation.svelte';
	import { createPayment, fetchInvoicePaidAmounts } from '$lib/stores/payments';
	import { createSupabaseBrowserClient } from '$lib/services/supabase';
	import { formatCurrency } from '$lib/utils/currency';
	import { formatDate } from '$lib/utils/dates';
	import { toast } from 'svelte-sonner';
	import type { InvoiceWithClient } from '$lib/stores/invoices';
	import { ChevronLeft, ChevronRight, Search, Loader2 } from '@lucide/svelte';

	const PAYMENT_TYPE_LABELS: Record<string, string> = {
		payment: 'Pago',
		credit_note: 'Nota de Credito',
		debit_note: 'Nota de Debito',
		retention: 'Retencion'
	};

	let {
		open = $bindable(false),
		onClose,
		onCreated,
		preselectedInvoices = [],
		country
	}: {
		open: boolean;
		onClose?: () => void;
		onCreated?: () => void;
		preselectedInvoices?: InvoiceWithClient[];
		country: string;
	} = $props();

	// Step management
	let step = $state(1);
	let submitting = $state(false);

	// Step 1: Payment info
	let amount = $state(0);
	let paymentDate = $state('');
	let reference = $state('');
	let notes = $state('');

	// Step 2: Invoice selection and allocation
	let allocationInvoices = $state<AllocationInvoice[]>([]);
	let allocations = $state<AllocationRow[]>([]);
	let loadingInvoices = $state(false);

	// Standalone invoice search (when no preselected invoices)
	let searchQuery = $state('');
	let searchResults = $state<AllocationInvoice[]>([]);
	let selectedInvoiceIds = $state<Set<string>>(new Set());

	const hasPreselected = $derived(preselectedInvoices.length > 0);

	// Validation
	const step1Valid = $derived(amount > 0 && paymentDate !== '' && reference.trim() !== '');

	const totalAllocated = $derived(
		allocations.reduce((sum, a) => sum + (a.amount || 0), 0)
	);

	const step2Valid = $derived(
		allocationInvoices.length > 0 &&
			allocations.length > 0 &&
			totalAllocated > 0 &&
			totalAllocated <= amount + 0.01
	);

	// Reset when dialog opens/closes
	$effect(() => {
		if (open) {
			step = 1;
			amount = 0;
			paymentDate = new Date().toISOString().slice(0, 10);
			reference = '';
			notes = '';
			allocations = [];
			allocationInvoices = [];
			searchQuery = '';
			searchResults = [];
			selectedInvoiceIds = new Set();
			submitting = false;

			if (hasPreselected) {
				loadPreselectedInvoices();
			}
		}
	});

	async function loadPreselectedInvoices() {
		loadingInvoices = true;
		const ids = preselectedInvoices.map((inv) => inv.id);
		const paidAmounts = await fetchInvoicePaidAmounts(ids);

		allocationInvoices = preselectedInvoices.map((inv) => ({
			id: inv.id,
			invoice_number: inv.invoice_number ?? '',
			client_name: inv.clients?.name ?? '-',
			gross_value: inv.gross_value ?? 0,
			total_paid: paidAmounts.get(inv.id) ?? inv.total_paid ?? 0
		}));

		allocations = [];
		loadingInvoices = false;
	}

	async function searchInvoices() {
		if (!searchQuery.trim()) return;
		loadingInvoices = true;

		const supabase = createSupabaseBrowserClient();
		const { data } = await supabase
			.from('invoices')
			.select('id, invoice_number, gross_value, client_id, clients(name)')
			.eq('country', country)
			.or(
				`invoice_number.ilike.%${searchQuery}%,agency.ilike.%${searchQuery}%,factura_interna.ilike.%${searchQuery}%`
			)
			.order('invoice_date', { ascending: false })
			.limit(20);

		if (data && data.length > 0) {
			const ids = data.map((d) => d.id);
			const paidAmounts = await fetchInvoicePaidAmounts(ids);

			searchResults = data.map((inv) => {
				const totalPaid = paidAmounts.get(inv.id) ?? 0;
				const grossValue = inv.gross_value ?? 0;
				return {
					id: inv.id,
					invoice_number: inv.invoice_number ?? '',
					client_name: (inv.clients as any)?.name ?? '-',
					gross_value: grossValue,
					total_paid: totalPaid
				};
			});
		} else {
			searchResults = [];
		}

		loadingInvoices = false;
	}

	function toggleInvoiceSelection(invoice: AllocationInvoice) {
		const newSet = new Set(selectedInvoiceIds);
		if (newSet.has(invoice.id)) {
			newSet.delete(invoice.id);
		} else {
			newSet.add(invoice.id);
		}
		selectedInvoiceIds = newSet;

		// Update allocation invoices based on selection
		allocationInvoices = searchResults.filter((inv) => selectedInvoiceIds.has(inv.id));
		allocations = [];
	}

	function goToStep(s: number) {
		step = s;
	}

	async function handleSubmit() {
		if (!step2Valid || submitting) return;
		submitting = true;

		try {
			const validAllocations = allocations.filter((a) => a.amount > 0);

			await createPayment({
				amount,
				payment_date: paymentDate,
				reference,
				country,
				notes: notes || undefined,
				details: validAllocations
			});

			toast.success('Pago registrado correctamente');
			open = false;
			onCreated?.();
			onClose?.();
		} catch (err) {
			console.error('Error creating payment:', err);
			toast.error('Error al registrar el pago');
		} finally {
			submitting = false;
		}
	}

	function handleClose() {
		open = false;
		onClose?.();
	}
</script>

<Dialog.Dialog bind:open onOpenChange={(v) => { if (!v) handleClose(); }}>
	<Dialog.DialogContent class="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
		<Dialog.DialogHeader>
			<Dialog.DialogTitle>
				{#if step === 1}
					Nuevo Pago - Informacion
				{:else if step === 2}
					Nuevo Pago - Asignacion a Facturas
				{:else}
					Nuevo Pago - Confirmacion
				{/if}
			</Dialog.DialogTitle>
			<Dialog.DialogDescription>
				{#if step === 1}
					Ingresa los datos del pago
				{:else if step === 2}
					Asigna el monto del pago a las facturas
				{:else}
					Revisa y confirma el pago
				{/if}
			</Dialog.DialogDescription>
		</Dialog.DialogHeader>

		<!-- Step indicators -->
		<div class="flex items-center gap-2 mb-2">
			{#each [1, 2, 3] as s}
				<div
					class="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors
						{s === step ? 'bg-primary text-primary-foreground' : s < step ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}"
				>
					{s}
				</div>
				{#if s < 3}
					<div class="h-0.5 flex-1 {s < step ? 'bg-primary/40' : 'bg-muted'}"></div>
				{/if}
			{/each}
		</div>

		<!-- Step 1: Payment Info -->
		{#if step === 1}
			<div class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="pay-amount">Monto</Label>
						<Input
							id="pay-amount"
							type="number"
							min="0"
							step="0.01"
							bind:value={amount}
							placeholder="0.00"
						/>
					</div>
					<div class="space-y-2">
						<Label for="pay-date">Fecha</Label>
						<Input id="pay-date" type="date" bind:value={paymentDate} />
					</div>
				</div>
				<div class="space-y-2">
					<Label for="pay-ref">Referencia</Label>
					<Input
						id="pay-ref"
						type="text"
						bind:value={reference}
						placeholder="Numero de transferencia, cheque, etc."
					/>
				</div>
				<div class="space-y-2">
					<Label for="pay-notes">Notas (opcional)</Label>
					<textarea
						id="pay-notes"
						bind:value={notes}
						placeholder="Notas adicionales..."
						class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					></textarea>
				</div>
			</div>

			<div class="flex justify-end pt-4">
				<Button disabled={!step1Valid} onclick={() => goToStep(2)}>
					Siguiente
					<ChevronRight class="ml-1 h-4 w-4" />
				</Button>
			</div>
		{/if}

		<!-- Step 2: Allocate to Invoices -->
		{#if step === 2}
			<div class="space-y-4">
				{#if !hasPreselected}
					<!-- Search for invoices -->
					<div class="flex items-center gap-2">
						<div class="relative flex-1">
							<Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
							<Input
								type="text"
								placeholder="Buscar factura por numero, agencia..."
								bind:value={searchQuery}
								onkeydown={(e) => { if (e.key === 'Enter') searchInvoices(); }}
								class="pl-8"
							/>
						</div>
						<Button variant="outline" size="sm" onclick={searchInvoices} disabled={loadingInvoices}>
							{#if loadingInvoices}
								<Loader2 class="h-4 w-4 animate-spin" />
							{:else}
								Buscar
							{/if}
						</Button>
					</div>

					{#if searchResults.length > 0}
						<div class="max-h-[200px] overflow-y-auto rounded-md border">
							<table class="w-full text-sm">
								<thead>
									<tr class="border-b bg-muted/50 sticky top-0">
										<th class="px-3 py-2 w-8"></th>
										<th class="px-3 py-2 text-left font-medium">Factura</th>
										<th class="px-3 py-2 text-left font-medium">Cliente</th>
										<th class="px-3 py-2 text-right font-medium">Bruto</th>
										<th class="px-3 py-2 text-right font-medium">Pendiente</th>
									</tr>
								</thead>
								<tbody>
									{#each searchResults as invoice}
										{@const remaining = (invoice.gross_value ?? 0) - invoice.total_paid}
										<tr
											class="border-b last:border-0 cursor-pointer hover:bg-muted/50"
											onclick={() => toggleInvoiceSelection(invoice)}
										>
											<td class="px-3 py-2">
												<input
													type="checkbox"
													checked={selectedInvoiceIds.has(invoice.id)}
													class="h-4 w-4"
													onclick={(e) => e.stopPropagation()}
													onchange={() => toggleInvoiceSelection(invoice)}
												/>
											</td>
											<td class="px-3 py-2 font-mono text-xs">{invoice.invoice_number}</td>
											<td class="px-3 py-2 text-xs">{invoice.client_name}</td>
											<td class="px-3 py-2 text-right text-xs">
												{formatCurrency(invoice.gross_value, country)}
											</td>
											<td class="px-3 py-2 text-right">
												<Badge variant={remaining <= 0 ? 'default' : 'outline'}>
													{formatCurrency(remaining, country)}
												</Badge>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}

					{#if allocationInvoices.length > 0}
						<Separator />
					{/if}
				{/if}

				{#if loadingInvoices && hasPreselected}
					<div class="flex items-center justify-center py-8">
						<Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
						<span class="ml-2 text-sm text-muted-foreground">Cargando facturas...</span>
					</div>
				{:else if allocationInvoices.length > 0}
					<PaymentAllocation
						invoices={allocationInvoices}
						bind:allocations
						paymentTotal={amount}
						{country}
					/>
				{:else if hasPreselected}
					<p class="text-sm text-muted-foreground text-center py-4">
						No hay facturas seleccionadas
					</p>
				{:else}
					<p class="text-sm text-muted-foreground text-center py-4">
						Busca y selecciona facturas para asignar el pago
					</p>
				{/if}
			</div>

			<div class="flex justify-between pt-4">
				<Button variant="outline" onclick={() => goToStep(1)}>
					<ChevronLeft class="mr-1 h-4 w-4" />
					Anterior
				</Button>
				<Button disabled={!step2Valid} onclick={() => goToStep(3)}>
					Siguiente
					<ChevronRight class="ml-1 h-4 w-4" />
				</Button>
			</div>
		{/if}

		<!-- Step 3: Confirmation -->
		{#if step === 3}
			<div class="space-y-4">
				<!-- Payment summary -->
				<div class="rounded-lg border bg-muted/30 p-4 space-y-2">
					<h4 class="font-semibold text-sm">Datos del pago</h4>
					<div class="grid grid-cols-2 gap-2 text-sm">
						<div>
							<span class="text-muted-foreground">Monto:</span>
							<span class="font-medium ml-1">{formatCurrency(amount, country)}</span>
						</div>
						<div>
							<span class="text-muted-foreground">Fecha:</span>
							<span class="font-medium ml-1">{formatDate(paymentDate)}</span>
						</div>
						<div>
							<span class="text-muted-foreground">Referencia:</span>
							<span class="font-medium ml-1">{reference}</span>
						</div>
						{#if notes}
							<div>
								<span class="text-muted-foreground">Notas:</span>
								<span class="font-medium ml-1">{notes}</span>
							</div>
						{/if}
					</div>
				</div>

				<Separator />

				<!-- Allocation summary -->
				<div>
					<h4 class="font-semibold text-sm mb-2">Asignacion a facturas</h4>
					<div class="rounded-md border">
						<table class="w-full text-sm">
							<thead>
								<tr class="border-b bg-muted/50">
									<th class="px-3 py-2 text-left font-medium">Factura</th>
									<th class="px-3 py-2 text-left font-medium">Cliente</th>
									<th class="px-3 py-2 text-right font-medium">Monto asignado</th>
									<th class="px-3 py-2 text-left font-medium">Tipo</th>
								</tr>
							</thead>
							<tbody>
								{#each allocations.filter((a) => a.amount > 0) as alloc, i}
									{@const invoice = allocationInvoices.find((inv) => inv.id === alloc.invoice_id)}
									<tr class="border-b last:border-0">
										<td class="px-3 py-2 font-mono text-xs">
											{invoice?.invoice_number ?? '-'}
										</td>
										<td class="px-3 py-2 text-xs">{invoice?.client_name ?? '-'}</td>
										<td class="px-3 py-2 text-right font-medium">
											{formatCurrency(alloc.amount, country)}
										</td>
										<td class="px-3 py-2">
											<Badge variant="secondary">
												{PAYMENT_TYPE_LABELS[alloc.payment_type] ?? alloc.payment_type}
											</Badge>
										</td>
									</tr>
								{/each}
							</tbody>
							<tfoot>
								<tr class="bg-muted/50">
									<td colspan="2" class="px-3 py-2 font-semibold">Total</td>
									<td class="px-3 py-2 text-right font-bold">
										{formatCurrency(totalAllocated, country)}
									</td>
									<td></td>
								</tr>
							</tfoot>
						</table>
					</div>
				</div>

				{#if amount - totalAllocated > 0.01}
					<div class="rounded-md border border-yellow-500/50 bg-yellow-500/10 px-3 py-2">
						<p class="text-xs text-yellow-700 dark:text-yellow-400 font-medium">
							Quedaran {formatCurrency(amount - totalAllocated, country)} sin asignar
						</p>
					</div>
				{/if}
			</div>

			<div class="flex justify-between pt-4">
				<Button variant="outline" onclick={() => goToStep(2)}>
					<ChevronLeft class="mr-1 h-4 w-4" />
					Anterior
				</Button>
				<Button disabled={submitting} onclick={handleSubmit}>
					{#if submitting}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						Registrando...
					{:else}
						Confirmar Pago
					{/if}
				</Button>
			</div>
		{/if}
	</Dialog.DialogContent>
</Dialog.Dialog>
