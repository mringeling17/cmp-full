<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import MonthPicker from '$lib/components/dashboard/MonthPicker.svelte';
	import { createSupabaseBrowserClient } from '$lib/services/supabase';
	import { toast } from 'svelte-sonner';
	import { formatCurrency } from '$lib/utils/currency';
	import type { InvoiceWithClient } from '$lib/stores/invoices';

	let {
		open = $bindable(false),
		invoice,
		country,
		onCreated
	}: {
		open: boolean;
		invoice: InvoiceWithClient | null;
		country: string;
		onCreated?: () => void;
	} = $props();

	const supabase = createSupabaseBrowserClient();

	// Adjustable numeric fields
	const ADJUSTABLE_FIELDS = [
		{ key: 'gross_value', label: 'Valor Bruto' },
		{ key: 'net_value', label: 'Valor Neto' },
		{ key: 'commission_amount', label: 'Monto Comisión' },
		{ key: 'spot_count', label: 'Cantidad Spots' }
	] as const;

	type AdjustableField = (typeof ADJUSTABLE_FIELDS)[number]['key'];

	// Form state
	let exhibitionMonth = $state('');
	let selectedFields = $state<Set<AdjustableField>>(new Set());
	let fieldValues = $state<Record<AdjustableField, string>>({
		gross_value: '',
		net_value: '',
		commission_amount: '',
		spot_count: ''
	});
	let saving = $state(false);

	// Reset form when dialog opens
	$effect(() => {
		if (open && invoice) {
			const now = new Date();
			exhibitionMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
			selectedFields = new Set();
			fieldValues = {
				gross_value: '',
				net_value: '',
				commission_amount: '',
				spot_count: ''
			};
		}
	});

	function toggleField(field: AdjustableField) {
		const next = new Set(selectedFields);
		if (next.has(field)) {
			next.delete(field);
		} else {
			next.add(field);
		}
		selectedFields = next;
	}

	function getOriginalValue(field: AdjustableField): number {
		if (!invoice) return 0;
		return (invoice[field] as number) ?? 0;
	}

	async function handleSubmit() {
		if (!invoice || selectedFields.size === 0) {
			toast.error('Selecciona al menos un campo a ajustar');
			return;
		}
		if (!exhibitionMonth) {
			toast.error('Selecciona el mes de exhibición');
			return;
		}

		saving = true;

		// Build the adjustment record — copy all fields from original, override selected ones
		const lastDay = new Date(
			parseInt(exhibitionMonth.split('-')[0]),
			parseInt(exhibitionMonth.split('-')[1]),
			0
		);
		const invoiceDate = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

		const adjustmentData: Record<string, unknown> = {
			invoice_number: invoice.invoice_number,
			invoice_date: invoiceDate,
			client_id: invoice.client_id,
			country: invoice.country,
			agency: invoice.agency,
			channel: invoice.channel,
			product: invoice.product,
			feed: invoice.feed,
			campaign_number: invoice.campaign_number,
			commission_percent: invoice.commission_percent,
			sales_executive: invoice.sales_executive,
			system_source: invoice.system_source,
			business_type: invoice.business_type,
			company_code: invoice.company_code,
			channel_by_feed: invoice.channel_by_feed,
			order_reference: invoice.order_reference,
			document_type: 'Ajuste',
			exhibition_month: exhibitionMonth,
			created_at: new Date().toISOString(),
			// Default numeric fields to 0
			gross_value: 0,
			net_value: 0,
			commission_amount: 0,
			spot_count: 0
		};

		// Set only the selected fields with their adjustment values
		for (const field of selectedFields) {
			const val = parseFloat(fieldValues[field]);
			if (isNaN(val)) {
				toast.error(`Valor inválido para ${ADJUSTABLE_FIELDS.find((f) => f.key === field)?.label}`);
				saving = false;
				return;
			}
			adjustmentData[field] = val;
		}

		const { error } = await supabase.from('invoices').insert(adjustmentData as any);

		if (error) {
			console.error('Error creating adjustment:', error);
			toast.error('Error al crear el ajuste');
			saving = false;
			return;
		}

		toast.success('Ajuste creado correctamente');
		saving = false;
		open = false;
		onCreated?.();
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Crear Ajuste</Dialog.Title>
			<Dialog.Description>
				Ajuste para factura <strong>{invoice?.invoice_number}</strong>
				{#if invoice?.clients?.name}
					— {invoice.clients.name}
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-2">
			<!-- Exhibition month -->
			<div class="space-y-1.5">
				<Label>Mes de exhibición del ajuste</Label>
				<MonthPicker bind:value={exhibitionMonth} />
			</div>

			<!-- Field selection -->
			<div class="space-y-2">
				<Label>Campos a ajustar</Label>
				<p class="text-xs text-muted-foreground">Selecciona los campos e ingresa el valor del ajuste (usa negativos para reducciones)</p>

				{#each ADJUSTABLE_FIELDS as field}
					{@const isSelected = selectedFields.has(field.key)}
					<div class="rounded-md border p-3 {isSelected ? 'border-primary bg-primary/5' : ''}">
						<div class="flex items-center justify-between">
							<button
								type="button"
								class="flex items-center gap-2 text-sm font-medium cursor-pointer"
								onclick={() => toggleField(field.key)}
							>
								<div
									class="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border {isSelected
										? 'bg-primary border-primary text-primary-foreground'
										: 'border-input'}"
								>
									{#if isSelected}
										<span class="text-xs">✓</span>
									{/if}
								</div>
								{field.label}
							</button>
							<span class="text-xs text-muted-foreground">
								Original: {field.key === 'spot_count'
									? getOriginalValue(field.key)
									: formatCurrency(getOriginalValue(field.key), country)}
							</span>
						</div>
						{#if isSelected}
							<div class="mt-2">
								<Input
									type="number"
									step="any"
									placeholder="Ej: -90576"
									bind:value={fieldValues[field.key]}
									class="h-8 text-sm"
								/>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Cancelar</Button>
			<Button onclick={handleSubmit} disabled={saving || selectedFields.size === 0}>
				{saving ? 'Creando...' : 'Crear Ajuste'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
