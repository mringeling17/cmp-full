<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { formatCurrency } from '$lib/utils/currency';
	import { formatDate } from '$lib/utils/dates';
	import { fetchPaymentDetails } from '$lib/stores/payments';
	import type { PaymentWithDetails, PaymentDetail } from '$lib/stores/payments';
	import { CalendarDays, FileText, Hash, StickyNote } from '@lucide/svelte';

	const PAYMENT_TYPE_LABELS: Record<string, string> = {
		payment: 'Pago',
		credit_note: 'Nota de Credito',
		debit_note: 'Nota de Debito',
		retention: 'Retencion'
	};

	const PAYMENT_TYPE_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
		payment: 'default',
		credit_note: 'secondary',
		debit_note: 'outline',
		retention: 'destructive'
	};

	let {
		open = $bindable(false),
		payment
	}: {
		open: boolean;
		payment: PaymentWithDetails | null;
	} = $props();

	let details = $state<PaymentDetail[]>([]);
	let loadingDetails = $state(false);

	$effect(() => {
		if (open && payment) {
			loadDetails(payment.id);
		} else {
			details = [];
		}
	});

	async function loadDetails(paymentId: string) {
		loadingDetails = true;
		details = await fetchPaymentDetails(paymentId);
		loadingDetails = false;
	}
</script>

<Dialog.Dialog bind:open>
	<Dialog.DialogContent class="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
		<Dialog.DialogHeader>
			<Dialog.DialogTitle>Detalle del Pago</Dialog.DialogTitle>
			<Dialog.DialogDescription>
				Informacion del pago y facturas asociadas
			</Dialog.DialogDescription>
		</Dialog.DialogHeader>

		{#if payment}
			<div class="space-y-4">
				<!-- Payment info -->
				<div class="grid grid-cols-2 gap-4">
					<div class="flex items-center gap-2">
						<Hash class="h-4 w-4 text-muted-foreground" />
						<div>
							<p class="text-xs text-muted-foreground">Referencia</p>
							<p class="text-sm font-medium">{payment.reference}</p>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<CalendarDays class="h-4 w-4 text-muted-foreground" />
						<div>
							<p class="text-xs text-muted-foreground">Fecha</p>
							<p class="text-sm font-medium">{formatDate(payment.payment_date)}</p>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<FileText class="h-4 w-4 text-muted-foreground" />
						<div>
							<p class="text-xs text-muted-foreground">Monto Total</p>
							<p class="text-sm font-bold">{formatCurrency(payment.amount, payment.country)}</p>
						</div>
					</div>
					{#if payment.notes}
						<div class="flex items-center gap-2">
							<StickyNote class="h-4 w-4 text-muted-foreground" />
							<div>
								<p class="text-xs text-muted-foreground">Notas</p>
								<p class="text-sm">{payment.notes}</p>
							</div>
						</div>
					{/if}
				</div>

				<Separator />

				<!-- Details table -->
				<div>
					<h4 class="text-sm font-semibold mb-3">Facturas asociadas</h4>
					{#if loadingDetails}
						<p class="text-sm text-muted-foreground">Cargando detalles...</p>
					{:else if details.length === 0}
						<p class="text-sm text-muted-foreground">Sin detalles</p>
					{:else}
						<div class="rounded-md border">
							<table class="w-full text-sm">
								<thead>
									<tr class="border-b bg-muted/50">
										<th class="px-3 py-2 text-left font-medium">Factura</th>
										<th class="px-3 py-2 text-left font-medium">Cliente</th>
										<th class="px-3 py-2 text-right font-medium">Monto</th>
										<th class="px-3 py-2 text-left font-medium">Tipo</th>
									</tr>
								</thead>
								<tbody>
									{#each details as detail}
										<tr class="border-b last:border-0">
											<td class="px-3 py-2 font-mono text-xs">
												{detail.invoice?.invoice_number ?? '-'}
											</td>
											<td class="px-3 py-2">
												{detail.invoice?.clients?.name ?? '-'}
											</td>
											<td class="px-3 py-2 text-right font-medium">
												{formatCurrency(detail.amount, payment.country)}
											</td>
											<td class="px-3 py-2">
												<Badge variant={PAYMENT_TYPE_VARIANTS[detail.payment_type] ?? 'outline'}>
													{PAYMENT_TYPE_LABELS[detail.payment_type] ?? detail.payment_type}
												</Badge>
											</td>
										</tr>
									{/each}
								</tbody>
								<tfoot>
									<tr class="bg-muted/50">
										<td colspan="2" class="px-3 py-2 font-semibold">Total asignado</td>
										<td class="px-3 py-2 text-right font-bold">
											{formatCurrency(
												details.reduce((sum, d) => sum + d.amount, 0),
												payment.country
											)}
										</td>
										<td></td>
									</tr>
								</tfoot>
							</table>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</Dialog.DialogContent>
</Dialog.Dialog>
