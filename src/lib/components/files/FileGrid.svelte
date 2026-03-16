<script lang="ts">
	import AgGridSvelte from 'ag-grid-svelte5';
	import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
	import type { ColDef, GridOptions, GridApi } from '@ag-grid-community/core';
	import { formatDate } from '$lib/utils/dates';
	import { downloadFile, softDeleteFile, markFileProcessed, fetchFiles } from '$lib/stores/files';
	import type { FileRecord } from '$lib/stores/files';
	import { FILE_TYPE_LABELS } from './FileTypeDetector';
	import { toast } from 'svelte-sonner';
	import * as Select from '$lib/components/ui/select/index.js';
	import { FILE_TYPE_OPTIONS } from './FileTypeDetector';
	import { mode } from 'mode-watcher';

	let gridClass = $derived(mode.current === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz');

	let {
		files,
		loading = false,
		onRefresh,
		onProcessExcel
	}: {
		files: FileRecord[];
		loading?: boolean;
		onRefresh?: () => void;
		onProcessExcel?: (file: FileRecord) => void;
	} = $props();

	let gridApi: GridApi | null = null;

	// Filter state
	let filterFileType = $state<string>('all');
	let filterProcessed = $state<string>('all');

	const filteredFiles = $derived.by(() => {
		let result = files;
		if (filterFileType !== 'all') {
			result = result.filter((f) => f.file_type === filterFileType);
		}
		if (filterProcessed !== 'all') {
			const isProcVal = filterProcessed === 'yes';
			result = result.filter((f) => f.processed === isProcVal);
		}
		return result;
	});

	// Confirmation state for delete
	let deleteConfirmId = $state<string | null>(null);

	async function handleDownload(file: FileRecord) {
		try {
			await downloadFile(file);
		} catch (err) {
			console.error('Error downloading file:', err);
			toast.error('Error al descargar el archivo');
		}
	}

	async function handleDelete(fileId: string) {
		if (deleteConfirmId !== fileId) {
			deleteConfirmId = fileId;
			// Auto-clear confirmation after 3 seconds
			setTimeout(() => {
				deleteConfirmId = null;
			}, 3000);
			return;
		}
		try {
			await softDeleteFile(fileId);
			toast.success('Archivo eliminado');
			deleteConfirmId = null;
			onRefresh?.();
		} catch (err) {
			console.error('Error deleting file:', err);
			toast.error('Error al eliminar el archivo');
		}
	}

	async function handleToggleProcessed(file: FileRecord) {
		try {
			const newVal = !file.processed;
			await markFileProcessed(file.id, newVal);
			toast.success(newVal ? 'Archivo marcado como procesado' : 'Archivo marcado como no procesado');
			onRefresh?.();
		} catch (err) {
			console.error('Error toggling processed:', err);
			toast.error('Error al actualizar el archivo');
		}
	}

	const columnDefs: ColDef<FileRecord>[] = [
		{
			field: 'filename',
			headerName: 'Nombre',
			flex: 1,
			minWidth: 200
		},
		{
			field: 'file_type',
			headerName: 'Tipo',
			width: 160,
			valueFormatter: (p) => FILE_TYPE_LABELS[p.value] ?? p.value ?? '-'
		},
		{
			field: 'status',
			headerName: 'Estado',
			width: 100,
			cellRenderer: (params: { value: string }) => {
				const el = document.createElement('span');
				const status = params.value;
				const isActive = status === 'active';
				el.style.cssText = `display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: 500; ${
					isActive
						? 'background-color: #dcfce7; color: #166534;'
						: 'background-color: #fee2e2; color: #991b1b;'
				}`;
				el.textContent = isActive ? 'Activo' : status;
				return el;
			}
		},
		{
			field: 'processed',
			headerName: 'Procesado',
			width: 110,
			cellRenderer: (params: { value: boolean | null }) => {
				const el = document.createElement('span');
				const processed = params.value === true;
				el.style.cssText = `display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: 500; ${
					processed
						? 'background-color: #dcfce7; color: #166534;'
						: 'background-color: #fef9c3; color: #854d0e;'
				}`;
				el.textContent = processed ? 'Si' : 'No';
				return el;
			}
		},
		{
			field: 'uploaded_at',
			headerName: 'Subido',
			width: 130,
			sort: 'desc',
			valueFormatter: (p) => formatDate(p.value)
		},
		{
			field: 'processed_at',
			headerName: 'Procesado el',
			width: 130,
			valueFormatter: (p) => formatDate(p.value)
		},
		{
			headerName: 'Acciones',
			width: 300,
			sortable: false,
			resizable: false,
			cellRenderer: (params: { data: FileRecord }) => {
				const container = document.createElement('div');
				container.style.cssText =
					'display: flex; gap: 4px; align-items: center; height: 100%;';

				// Download button
				const dlBtn = document.createElement('button');
				dlBtn.textContent = 'Descargar';
				dlBtn.style.cssText =
					'padding: 2px 8px; font-size: 12px; border-radius: 4px; border: 1px solid #e2e8f0; background: white; cursor: pointer;';
				dlBtn.addEventListener('click', (e) => {
					e.stopPropagation();
					handleDownload(params.data);
				});

				// Process Excel button - for invoice_summary files (processed or not)
				if (
					params.data.file_type === 'invoice_summary' &&
					onProcessExcel
				) {
					const processExcelBtn = document.createElement('button');
					const isReprocess = params.data.processed === true;
					processExcelBtn.textContent = isReprocess ? 'Reprocesar' : 'Procesar Excel';
					processExcelBtn.style.cssText =
						`padding: 2px 8px; font-size: 12px; border-radius: 4px; border: 1px solid ${isReprocess ? '#f59e0b' : '#3b82f6'}; background: ${isReprocess ? '#fffbeb' : '#eff6ff'}; color: ${isReprocess ? '#92400e' : '#1d4ed8'}; cursor: pointer; font-weight: 500;`;
					processExcelBtn.addEventListener('click', (e) => {
						e.stopPropagation();
						onProcessExcel(params.data);
					});
					container.appendChild(processExcelBtn);
				}

				// Delete button
				const delBtn = document.createElement('button');
				const isConfirming = deleteConfirmId === params.data.id;
				delBtn.textContent = isConfirming ? 'Confirmar' : 'Eliminar';
				delBtn.style.cssText = `padding: 2px 8px; font-size: 12px; border-radius: 4px; border: 1px solid #e2e8f0; background: ${isConfirming ? '#ef4444' : '#fee2e2'}; color: ${isConfirming ? 'white' : '#991b1b'}; cursor: pointer;`;
				delBtn.addEventListener('click', (e) => {
					e.stopPropagation();
					handleDelete(params.data.id);
				});

				container.appendChild(dlBtn);
				container.appendChild(delBtn);
				return container;
			}
		}
	];

	const gridOptions: GridOptions<FileRecord> = {
		columnDefs,
		defaultColDef: {
			sortable: true,
			resizable: true,
			filter: false
		},
		rowSelection: 'single',
		pagination: false,
		overlayLoadingTemplate:
			'<span class="ag-overlay-loading-center">Cargando archivos...</span>',
		overlayNoRowsTemplate:
			'<span class="ag-overlay-no-rows-center">Sin archivos para mostrar</span>',
		onGridReady: (params) => {
			gridApi = params.api;
		}
	};

	$effect(() => {
		if (gridApi) {
			if (loading) {
				gridApi.showLoadingOverlay();
			} else if (filteredFiles.length === 0) {
				gridApi.showNoRowsOverlay();
			} else {
				gridApi.hideOverlay();
			}
		}
	});

	const fileTypeLabel = $derived(
		filterFileType === 'all' ? 'Tipo' : (FILE_TYPE_LABELS[filterFileType] ?? filterFileType)
	);

	const processedLabel = $derived(
		filterProcessed === 'all' ? 'Procesado' : filterProcessed === 'yes' ? 'Si' : 'No'
	);
</script>

<!-- Filters -->
<div class="mb-3 flex items-center gap-2">
	<Select.Select
		type="single"
		value={filterFileType}
		onValueChange={(v) => {
			if (v) filterFileType = v;
		}}
	>
		<Select.SelectTrigger size="sm" class="h-9 w-[170px]">
			{#snippet children()}
				<span class="text-xs">{fileTypeLabel}</span>
			{/snippet}
		</Select.SelectTrigger>
		<Select.SelectContent>
			<Select.SelectItem value="all">Todos los tipos</Select.SelectItem>
			{#each FILE_TYPE_OPTIONS as opt}
				<Select.SelectItem value={opt.value}>{opt.label}</Select.SelectItem>
			{/each}
		</Select.SelectContent>
	</Select.Select>

	<Select.Select
		type="single"
		value={filterProcessed}
		onValueChange={(v) => {
			if (v) filterProcessed = v;
		}}
	>
		<Select.SelectTrigger size="sm" class="h-9 w-[130px]">
			{#snippet children()}
				<span class="text-xs">{processedLabel}</span>
			{/snippet}
		</Select.SelectTrigger>
		<Select.SelectContent>
			<Select.SelectItem value="all">Todos</Select.SelectItem>
			<Select.SelectItem value="yes">Si</Select.SelectItem>
			<Select.SelectItem value="no">No</Select.SelectItem>
		</Select.SelectContent>
	</Select.Select>
</div>

<!-- Grid -->
<div class="w-full" style="height: 500px;">
	<AgGridSvelte
		{gridOptions}
		{gridClass}
		rowData={filteredFiles}
		modules={[ClientSideRowModelModule] as any}
	/>
</div>
