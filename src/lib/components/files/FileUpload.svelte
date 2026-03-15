<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Upload, X, FileText, FileSpreadsheet, FileArchive, File as LucideFile } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { detectFileType, FILE_TYPE_LABELS, FILE_TYPE_OPTIONS } from './FileTypeDetector';
	import { uploadFile } from '$lib/stores/files';
	import { selectedCountry } from '$lib/stores/country';

	let { onUploadComplete }: { onUploadComplete?: () => void } = $props();

	let country = $state('ar');
	selectedCountry.subscribe((v) => (country = v));

	interface PendingFile {
		file: File;
		fileType: string;
	}

	let pendingFiles = $state<PendingFile[]>([]);
	let isDragOver = $state(false);
	let uploading = $state(false);
	let uploadProgress = $state(0);

	const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.pdf', '.zip'];

	function isAcceptedFile(file: File): boolean {
		const name = file.name.toLowerCase();
		return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
	}

	function getFileIconType(filename: string): 'pdf' | 'spreadsheet' | 'archive' | 'other' {
		const lower = filename.toLowerCase();
		if (lower.endsWith('.pdf')) return 'pdf';
		if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return 'spreadsheet';
		if (lower.endsWith('.zip')) return 'archive';
		return 'other';
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragOver = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		isDragOver = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragOver = false;
		if (e.dataTransfer?.files) {
			addFiles(Array.from(e.dataTransfer.files));
		}
	}

	function handleFileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files) {
			addFiles(Array.from(input.files));
			input.value = '';
		}
	}

	function addFiles(files: File[]) {
		const accepted = files.filter(isAcceptedFile);
		const rejected = files.length - accepted.length;

		if (rejected > 0) {
			toast.error(`${rejected} archivo(s) rechazado(s). Formatos aceptados: ${ACCEPTED_EXTENSIONS.join(', ')}`);
		}

		const newPending: PendingFile[] = accepted.map((file) => ({
			file,
			fileType: detectFileType(file.name)
		}));

		pendingFiles = [...pendingFiles, ...newPending];
	}

	function removeFile(index: number) {
		pendingFiles = pendingFiles.filter((_, i) => i !== index);
	}

	function updateFileType(index: number, newType: string) {
		pendingFiles = pendingFiles.map((pf, i) =>
			i === index ? { ...pf, fileType: newType } : pf
		);
	}

	async function handleUpload() {
		if (pendingFiles.length === 0) return;

		uploading = true;
		uploadProgress = 0;
		let successCount = 0;
		let errorCount = 0;

		for (let i = 0; i < pendingFiles.length; i++) {
			const pf = pendingFiles[i];
			try {
				await uploadFile(pf.file, pf.fileType, country);
				successCount++;
			} catch (err) {
				console.error(`Error uploading ${pf.file.name}:`, err);
				errorCount++;
			}
			uploadProgress = Math.round(((i + 1) / pendingFiles.length) * 100);
		}

		uploading = false;
		pendingFiles = [];

		if (successCount > 0) {
			toast.success(`${successCount} archivo(s) subido(s) correctamente`);
		}
		if (errorCount > 0) {
			toast.error(`${errorCount} archivo(s) fallaron al subir`);
		}

		onUploadComplete?.();
	}

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}
</script>

<Card>
	<CardHeader>
		<CardTitle class="text-lg">Subir Archivos</CardTitle>
	</CardHeader>
	<CardContent class="space-y-4">
		<!-- Drop zone -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors {isDragOver
				? 'border-primary bg-primary/5'
				: 'border-muted-foreground/25 hover:border-primary/50'}"
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
			onclick={() => document.getElementById('file-input')?.click()}
			role="button"
			tabindex="0"
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					document.getElementById('file-input')?.click();
				}
			}}
		>
			<Upload class="mb-3 h-10 w-10 text-muted-foreground" />
			<p class="text-sm font-medium">
				Arrastra archivos aqui o haz clic para seleccionar
			</p>
			<p class="mt-1 text-xs text-muted-foreground">
				Formatos aceptados: .xlsx, .xls, .pdf, .zip
			</p>
			<input
				id="file-input"
				type="file"
				multiple
				accept=".xlsx,.xls,.pdf,.zip"
				class="hidden"
				onchange={handleFileInput}
			/>
		</div>

		<!-- Pending files list -->
		{#if pendingFiles.length > 0}
			<div class="space-y-2">
				<p class="text-sm font-medium">
					{pendingFiles.length} archivo(s) seleccionado(s)
				</p>
				{#each pendingFiles as pf, index}
					<div class="flex items-center gap-3 rounded-md border p-3">
						{#if getFileIconType(pf.file.name) === 'pdf'}
							<FileText class="h-5 w-5 shrink-0 text-muted-foreground" />
						{:else if getFileIconType(pf.file.name) === 'spreadsheet'}
							<FileSpreadsheet class="h-5 w-5 shrink-0 text-muted-foreground" />
						{:else if getFileIconType(pf.file.name) === 'archive'}
							<FileArchive class="h-5 w-5 shrink-0 text-muted-foreground" />
						{:else}
							<LucideFile class="h-5 w-5 shrink-0 text-muted-foreground" />
						{/if}
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium">{pf.file.name}</p>
							<p class="text-xs text-muted-foreground">{formatSize(pf.file.size)}</p>
						</div>
						<Select.Select
							type="single"
							value={pf.fileType}
							onValueChange={(v) => {
								if (v) updateFileType(index, v);
							}}
						>
							<Select.SelectTrigger size="sm" class="h-8 w-[160px]">
								{#snippet children()}
									<span class="text-xs">{FILE_TYPE_LABELS[pf.fileType] ?? pf.fileType}</span>
								{/snippet}
							</Select.SelectTrigger>
							<Select.SelectContent>
								{#each FILE_TYPE_OPTIONS as opt}
									<Select.SelectItem value={opt.value}>{opt.label}</Select.SelectItem>
								{/each}
							</Select.SelectContent>
						</Select.Select>
						<Button
							variant="ghost"
							size="sm"
							class="h-8 w-8 p-0"
							onclick={() => removeFile(index)}
							disabled={uploading}
						>
							<X class="h-4 w-4" />
						</Button>
					</div>
				{/each}
			</div>

			<!-- Upload button and progress -->
			<div class="flex items-center gap-4">
				<Button onclick={handleUpload} disabled={uploading || pendingFiles.length === 0}>
					{#if uploading}
						Subiendo... {uploadProgress}%
					{:else}
						<Upload class="mr-2 h-4 w-4" />
						Subir {pendingFiles.length} archivo(s)
					{/if}
				</Button>
				{#if uploading}
					<div class="h-2 flex-1 overflow-hidden rounded-full bg-muted">
						<div
							class="h-full bg-primary transition-all duration-300"
							style="width: {uploadProgress}%"
						></div>
					</div>
				{/if}
			</div>
		{/if}
	</CardContent>
</Card>
