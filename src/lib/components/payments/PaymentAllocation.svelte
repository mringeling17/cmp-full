<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { formatCurrency } from '$lib/utils/currency';

	export interface AllocationInvoice {
		id: string;
		invoice_number: string;
		client_name: string;
		gross_value: number;
		total_paid: number;
	}

	export interface AllocationRow {
		invoice_id: string;
		amount: number;
		payment_type: string;
	}

	const PAYMENT_TYPES = [
		{ value: 'payment', label: 'Pago' },
		{ value: 'credit_note', label: 'Nota de Credito' },
		{ value: 'debit_note', label: 'Nota de Debito' },
		{ value: 'retention', label: 'Retencion' }
	];

	let {
		invoices,
		allocations = $bindable([]),
		paymentTotal,
		country
	}: {
		invoices: AllocationInvoice[];
		allocations: AllocationRow[];
		paymentTotal: number;
		country: string;
	} = $props();

	// Initialize allocations when invoices change
	$effect(() => {
		if (invoices.length > 0 && allocations.length === 0) {
			allocations = invoices.map((inv) => ({
				invoice_id: inv.id,
				amount: 0,
				payment_type: 'payment'
			}));
		}
	});

	const totalAllocated = $derived(
		allocations.reduce((sum, a) => sum + (a.amount || 0), 0)
	);

	const remaining = $derived(paymentTotal - totalAllocated);

	function getRemainingForInvoice(invoice: AllocationInvoice): number {
		// CRITICAL: correct parentheses to avoid operator precedence bug
		return (invoice.gross_value ?? 0) - invoice.total_paid;
	}

	function handleAmountChange(index: number, value: string) {
		const num = parseFloat(value) || 0;
		allocations[index] = { ...allocations[index], amount: num };
		allocations = [...allocations];
	}

	function handleTypeChange(index: number, value: string) {
		if (value) {
			allocations[index] = { ...allocations[index], payment_type: value };
			allocations = [...allocations];
		}
	}

	function autoFillRemaining() {
		let availablePayment = paymentTotal;
		const updated = allocations.map((alloc, i) => {
			const invoice = invoices[i];
			const invoiceRemaining = getRemainingForInvoice(invoice);
			const toAssign = Math.min(invoiceRemaining, availablePayment);
			availablePayment -= toAssign;
			return { ...alloc, amount: Math.round(toAssign * 100) / 100 };
		});
		allocations = updated;
	}

	function getPaymentTypeLabel(value: string): string {
		return PAYMENT_TYPES.find((t) => t.value === value)?.label ?? value;
	}
</script>

<div class="space-y-4">
	<!-- Summary bar -->
	<div class="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-3">
		<div class="flex items-center gap-6">
			<div>
				<p class="text-xs text-muted-foreground">Monto del pago</p>
				<p class="text-sm font-bold">{formatCurrency(paymentTotal, country)}</p>
			</div>
			<div>
				<p class="text-xs text-muted-foreground">Asignado</p>
				<p class="text-sm font-semibold" class:text-destructive={totalAllocated > paymentTotal}>
					{formatCurrency(totalAllocated, country)}
				</p>
			</div>
			<div>
				<p class="text-xs text-muted-foreground">Restante</p>
				<p class="text-sm font-semibold" class:text-destructive={remaining < 0}>
					{formatCurrency(remaining, country)}
				</p>
			</div>
		</div>
		<button
			type="button"
			class="text-xs text-primary hover:underline font-medium"
			onclick={autoFillRemaining}
		>
			Auto-asignar
		</button>
	</div>

	{#if remaining < -0.01}
		<div class="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2">
			<p class="text-xs text-destructive font-medium">
				El monto asignado excede el monto del pago
			</p>
		</div>
	{/if}

	<!-- Invoice allocation rows -->
	<div class="rounded-md border">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b bg-muted/50">
					<th class="px-3 py-2 text-left font-medium">Factura</th>
					<th class="px-3 py-2 text-left font-medium">Cliente</th>
					<th class="px-3 py-2 text-right font-medium">Bruto</th>
					<th class="px-3 py-2 text-right font-medium">Pagado</th>
					<th class="px-3 py-2 text-right font-medium">Pendiente</th>
					<th class="px-3 py-2 text-right font-medium w-[140px]">Asignar</th>
					<th class="px-3 py-2 text-left font-medium w-[160px]">Tipo</th>
				</tr>
			</thead>
			<tbody>
				{#each invoices as invoice, i}
					{@const invoiceRemaining = getRemainingForInvoice(invoice)}
					{@const allocation = allocations[i]}
					<tr class="border-b last:border-0">
						<td class="px-3 py-2 font-mono text-xs">{invoice.invoice_number}</td>
						<td class="px-3 py-2 text-xs">{invoice.client_name}</td>
						<td class="px-3 py-2 text-right text-xs">
							{formatCurrency(invoice.gross_value, country)}
						</td>
						<td class="px-3 py-2 text-right text-xs">
							{formatCurrency(invoice.total_paid, country)}
						</td>
						<td class="px-3 py-2 text-right">
							<Badge variant={invoiceRemaining <= 0 ? 'default' : 'outline'}>
								{formatCurrency(invoiceRemaining, country)}
							</Badge>
						</td>
						<td class="px-3 py-2">
							<Input
								type="number"
								min="0"
								max={invoiceRemaining}
								step="0.01"
								value={allocation?.amount?.toString() ?? '0'}
								oninput={(e) => handleAmountChange(i, (e.target as HTMLInputElement).value)}
								class="h-8 text-right text-xs w-full"
							/>
						</td>
						<td class="px-3 py-2">
							<Select.Select
								type="single"
								value={allocation?.payment_type ?? 'payment'}
								onValueChange={(v) => handleTypeChange(i, v)}
							>
								<Select.SelectTrigger size="sm" class="h-8 w-full">
									{#snippet children()}
										<span class="text-xs">{getPaymentTypeLabel(allocation?.payment_type ?? 'payment')}</span>
									{/snippet}
								</Select.SelectTrigger>
								<Select.SelectContent>
									{#each PAYMENT_TYPES as pt}
										<Select.SelectItem value={pt.value}>{pt.label}</Select.SelectItem>
									{/each}
								</Select.SelectContent>
							</Select.Select>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
