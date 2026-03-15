<script lang="ts">
	import AgGridSvelte from 'ag-grid-svelte5';
	import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
	import type { ColDef, GridOptions, GridApi } from '@ag-grid-community/core';
	import { formatCurrency } from '$lib/utils/currency';
	import { formatDate } from '$lib/utils/dates';
	import { selectedCountry } from '$lib/stores/country';
	import type { PaymentWithDetails } from '$lib/stores/payments';
	import { mode } from 'mode-watcher';

	let gridClass = $derived(mode.current === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz');

	let {
		payments,
		loading = false,
		onRowClicked
	}: {
		payments: PaymentWithDetails[];
		loading?: boolean;
		onRowClicked?: (payment: PaymentWithDetails) => void;
	} = $props();

	let country = $state('ar');
	selectedCountry.subscribe((v) => (country = v));

	let gridApi: GridApi | null = null;

	const columnDefs: ColDef<PaymentWithDetails>[] = [
		{
			field: 'payment_date',
			headerName: 'Fecha',
			width: 120,
			valueFormatter: (p) => formatDate(p.value)
		},
		{
			field: 'reference',
			headerName: 'Referencia',
			width: 200
		},
		{
			field: 'amount',
			headerName: 'Monto',
			width: 150,
			type: 'numericColumn',
			valueFormatter: (p) => formatCurrency(p.value, country)
		},
		{
			field: 'notes',
			headerName: 'Notas',
			flex: 1,
			valueFormatter: (p) => p.value ?? '-'
		},
		{
			field: 'created_at',
			headerName: 'Creado',
			width: 120,
			valueFormatter: (p) => formatDate(p.value)
		}
	];

	const gridOptions: GridOptions<PaymentWithDetails> = {
		columnDefs,
		defaultColDef: {
			sortable: true,
			resizable: true,
			filter: false
		},
		rowSelection: 'single',
		pagination: false,
		overlayLoadingTemplate:
			'<span class="ag-overlay-loading-center">Cargando pagos...</span>',
		overlayNoRowsTemplate:
			'<span class="ag-overlay-no-rows-center">Sin pagos para mostrar</span>',
		onGridReady: (params) => {
			gridApi = params.api;
		},
		onRowClicked: (event) => {
			if (event.data && onRowClicked) {
				onRowClicked(event.data);
			}
		}
	};

	$effect(() => {
		if (gridApi) {
			if (loading) {
				gridApi.showLoadingOverlay();
			} else if (payments.length === 0) {
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
		rowData={payments}
		modules={[ClientSideRowModelModule] as any}
	/>
</div>
