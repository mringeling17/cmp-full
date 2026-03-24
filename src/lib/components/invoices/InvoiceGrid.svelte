<script lang="ts">
	import AgGridSvelte from 'ag-grid-svelte5';
	import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
	import type { ColDef, GridOptions, GridApi, SortChangedEvent } from '@ag-grid-community/core';
	import { formatCurrency } from '$lib/utils/currency';
	import { formatDate } from '$lib/utils/dates';
	import { selectedCountry } from '$lib/stores/country';
	import { updateInvoiceField } from '$lib/stores/invoices';
	import type { InvoiceWithClient } from '$lib/stores/invoices';
	import { toast } from 'svelte-sonner';
	import { mode } from 'mode-watcher';

	let gridClass = $derived(mode.current === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz');

	let {
		invoices,
		loading = false,
		onSelectionChanged,
		onSortChanged,
		onAdjust
	}: {
		invoices: InvoiceWithClient[];
		loading?: boolean;
		onSelectionChanged?: (selected: InvoiceWithClient[]) => void;
		onSortChanged?: (field: string, direction: 'asc' | 'desc') => void;
		onAdjust?: (invoice: InvoiceWithClient) => void;
	} = $props();

	let country = $state('ar');
	selectedCountry.subscribe((v) => (country = v));

	let gridApi: GridApi | null = null;

	const columnDefs: ColDef<InvoiceWithClient>[] = [
		{
			headerCheckboxSelection: true,
			checkboxSelection: true,
			width: 50,
			pinned: 'left',
			headerCheckboxSelectionFilteredOnly: true,
			sortable: false,
			resizable: false
		},
		{
			field: 'invoice_number',
			headerName: 'N Factura',
			width: 130,
			pinned: 'left'
		},
		{
			field: 'invoice_date',
			headerName: 'Fecha',
			width: 110,
			valueFormatter: (p) => formatDate(p.value)
		},
		{
			headerName: 'Cliente',
			width: 200,
			sortable: false,
			valueGetter: (p) => p.data?.clients?.name ?? '-'
		},
		{ field: 'agency', headerName: 'Agencia', width: 180 },
		{ field: 'channel', headerName: 'Canal', width: 120 },
		{
			field: 'gross_value',
			headerName: 'Bruto',
			width: 130,
			type: 'numericColumn',
			valueFormatter: (p) => formatCurrency(p.value, country)
		},
		{
			field: 'net_value',
			headerName: 'Neto',
			width: 130,
			type: 'numericColumn',
			valueFormatter: (p) => formatCurrency(p.value, country)
		},
		{
			field: 'factura_interna',
			headerName: 'N Interno',
			width: 140,
			editable: true,
			cellStyle: { cursor: 'pointer' }
		},
		{
			field: 'credit_note',
			headerName: 'Nota Credito',
			width: 140,
			editable: true,
			cellStyle: { cursor: 'pointer' }
		},
		{
			headerName: '',
			width: 90,
			sortable: false,
			resizable: false,
			cellRenderer: (params: { data: InvoiceWithClient }) => {
				const btn = document.createElement('button');
				btn.textContent = 'Ajustar';
				btn.style.cssText =
					'padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; border: 1px solid #d1d5db; background: white; cursor: pointer; color: #374151;';
				btn.addEventListener('click', (e) => {
					e.stopPropagation();
					onAdjust?.(params.data);
				});
				return btn;
			}
		},
		{
			field: 'payment_status',
			headerName: 'Estado Pago',
			width: 130,
			sortable: false,
			cellRenderer: (params: { value: string }) => {
				const status = params.value;
				const colors: Record<string, string> = {
					paid: 'background-color: #dcfce7; color: #166534;',
					partial: 'background-color: #fef9c3; color: #854d0e;',
					unpaid: 'background-color: #fee2e2; color: #991b1b;'
				};
				const labels: Record<string, string> = {
					paid: 'Pagado',
					partial: 'Parcial',
					unpaid: 'Pendiente'
				};
				const el = document.createElement('span');
				el.style.cssText = `display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: 500; ${colors[status] ?? ''}`;
				el.textContent = labels[status] ?? status ?? '-';
				return el;
			}
		}
	];

	const gridOptions: GridOptions<InvoiceWithClient> = {
		columnDefs,
		defaultColDef: {
			sortable: true,
			resizable: true,
			filter: false
		},
		rowSelection: 'multiple',
		suppressRowClickSelection: true,
		pagination: false,
		overlayLoadingTemplate:
			'<span class="ag-overlay-loading-center">Cargando facturas...</span>',
		overlayNoRowsTemplate:
			'<span class="ag-overlay-no-rows-center">Sin facturas para mostrar</span>',
		onGridReady: (params) => {
			gridApi = params.api;
		},
		onSelectionChanged: () => {
			if (gridApi && onSelectionChanged) {
				const selected = gridApi.getSelectedRows();
				onSelectionChanged(selected);
			}
		},
		onCellValueChanged: async (event) => {
			const field = event.colDef.field;
			if (field === 'factura_interna' || field === 'credit_note') {
				try {
					await updateInvoiceField(event.data.id, field, event.newValue);
					toast.success(`Campo actualizado correctamente`);
				} catch (err) {
					console.error('Error updating field:', err);
					toast.error('Error al actualizar el campo');
					// Revert on error
					event.data[field] = event.oldValue;
					gridApi?.refreshCells({ rowNodes: [event.node!], force: true });
				}
			}
		},
		onSortChanged: (event: SortChangedEvent) => {
			if (onSortChanged) {
				const sortModel = event.api.getColumnState().filter((c) => c.sort);
				if (sortModel.length > 0) {
					const col = sortModel[0];
					onSortChanged(col.colId, col.sort as 'asc' | 'desc');
				}
			}
		}
	};

	$effect(() => {
		if (gridApi) {
			if (loading) {
				gridApi.showLoadingOverlay();
			} else if (invoices.length === 0) {
				gridApi.showNoRowsOverlay();
			} else {
				gridApi.hideOverlay();
			}
		}
	});
</script>

<div class="w-full" style="height: 600px;">
	<AgGridSvelte
		{gridOptions}
		{gridClass}
		rowData={invoices}
		modules={[ClientSideRowModelModule] as any}
	/>
</div>
