<script lang="ts">
	import { selectedCountry, countryConfig } from '$lib/stores/country';
	import { fetchFiles, filesList, filesLoading } from '$lib/stores/files';
	import type { FileRecord } from '$lib/stores/files';
	import FileUpload from '$lib/components/files/FileUpload.svelte';
	import FileGrid from '$lib/components/files/FileGrid.svelte';
	import ProcessExcel from '$lib/components/files/ProcessExcel.svelte';
	import SendCertifications from '$lib/components/files/SendCertifications.svelte';
	import GenerateCreditNotes from '$lib/components/files/GenerateCreditNotes.svelte';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { toast } from 'svelte-sonner';
	import { Loader2, Send } from '@lucide/svelte';

	// Reactive country value
	let country = $state('ar');
	selectedCountry.subscribe((v) => (country = v));

	// Processed Invoice Summary files (for credit notes generation)
	const processedInvoiceSummaries = $derived(
		$filesList.filter(
			(f) => f.file_type === 'invoice_summary' && f.processed === true && f.status === 'active'
		)
	);

	// Pending certificaciones (not processed)
	const pendingCertificaciones = $derived(
		$filesList.filter(
			(f) => f.file_type === 'certificaciones_pdf' && f.processed !== true && f.status === 'active'
		)
	);

	// File currently selected for Excel processing
	let processingFile = $state<FileRecord | null>(null);

	function loadFiles() {
		fetchFiles({ status: 'active' });
	}

	// React to country changes
	$effect(() => {
		country;
		loadFiles();
	});

	function handleUploadComplete() {
		loadFiles();
	}

	function handleRefresh() {
		loadFiles();
	}

	function handleProcessExcel(file: FileRecord) {
		processingFile = file;
	}

	function handleProcessed() {
		processingFile = null;
		loadFiles();
	}

	function handleCreditNotesGenerated() {
		loadFiles();
	}

	function handleCertificationsSent() {
		loadFiles();
	}

	// Test email
	let testEmail = $state('');
	let sendingTest = $state(false);

	async function handleTestEmail() {
		if (!testEmail) return;
		sendingTest = true;
		try {
			const res = await fetch('/api/test-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ to: testEmail })
			});
			const data = await res.json();
			if (data.success) {
				toast.success(data.message);
			} else {
				toast.error(`Error: ${data.error}`);
			}
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			toast.error(`Error: ${message}`);
		} finally {
			sendingTest = false;
		}
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Archivos</h1>
		<p class="text-sm text-muted-foreground">
			Gestion de archivos - {$countryConfig.name}
		</p>
	</div>

	<!-- Section 1: Upload -->
	<FileUpload onUploadComplete={handleUploadComplete} />

	<!-- Section 2: Process Excel (shown when a file is selected for processing) -->
	{#if processingFile}
		<Card>
			<CardHeader>
				<CardTitle class="text-lg">Procesar Invoice Summary</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="space-y-2">
					<p class="text-sm text-muted-foreground">
						Archivo: <span class="font-medium text-foreground">{processingFile.filename}</span>
					</p>
					<ProcessExcel
						fileId={processingFile.id}
						filename={processingFile.filename}
						onProcessed={handleProcessed}
					/>
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Section 3: File List -->
	<Card>
		<CardHeader>
			<CardTitle class="text-lg">Listado de Archivos</CardTitle>
		</CardHeader>
		<CardContent>
			<FileGrid
				files={$filesList}
				loading={$filesLoading}
				onRefresh={handleRefresh}
				onProcessExcel={handleProcessExcel}
			/>
		</CardContent>
	</Card>

	<!-- Section 4: Generate Credit Notes -->
	<Card>
		<CardHeader>
			<CardTitle class="text-lg">Generar Notas de Crédito</CardTitle>
		</CardHeader>
		<CardContent>
			<p class="mb-3 text-xs text-muted-foreground">
				Seleccioná el Invoice Summary ya procesado y subí el archivo de Xubio con los comprobantes asignados.
			</p>
			<GenerateCreditNotes
				invoiceSummaryFiles={processedInvoiceSummaries}
				onGenerated={handleCreditNotesGenerated}
			/>
		</CardContent>
	</Card>

	<!-- Section 5: Certificaciones Pendientes -->
	<Card>
		<CardHeader>
			<SendCertifications
				pendingFiles={pendingCertificaciones}
				onSent={handleCertificationsSent}
			/>
		</CardHeader>
	</Card>

	<!-- Section 6: Test Email -->
	<Card>
		<CardHeader>
			<CardTitle class="text-lg">Prueba de correo</CardTitle>
		</CardHeader>
		<CardContent>
			<p class="mb-3 text-xs text-muted-foreground">
				Enviá un correo de prueba para verificar que la configuración SMTP funciona correctamente.
			</p>
			<div class="flex items-center gap-2">
				<Input
					type="email"
					placeholder="email@ejemplo.com"
					class="h-9 w-[300px]"
					bind:value={testEmail}
					onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') handleTestEmail(); }}
				/>
				<Button
					size="sm"
					disabled={sendingTest || !testEmail}
					onclick={handleTestEmail}
				>
					{#if sendingTest}
						<Loader2 class="mr-1.5 h-3.5 w-3.5 animate-spin" />
						Enviando...
					{:else}
						<Send class="mr-1.5 h-3.5 w-3.5" />
						Enviar prueba
					{/if}
				</Button>
			</div>
		</CardContent>
	</Card>
</div>
