<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { toast } from 'svelte-sonner';
	import { Mail, Loader2, AlertTriangle } from '@lucide/svelte';
	import type { FileRecord } from '$lib/stores/files';

	let {
		pendingFiles = [],
		onSent
	}: {
		pendingFiles: FileRecord[];
		onSent?: () => void;
	} = $props();

	let sending = $state(false);
	let confirmOpen = $state(false);
	let resultMessage = $state<string | null>(null);

	async function handleSend() {
		sending = true;
		resultMessage = null;

		try {
			const response = await fetch('/api/send-certifications', {
				method: 'POST'
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Error al enviar certificaciones');
			}

			resultMessage = data.message || `Certificaciones enviadas correctamente`;
			toast.success('Certificaciones procesadas');
			confirmOpen = false;
			onSent?.();
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			toast.error(`Error: ${message}`);
		} finally {
			sending = false;
		}
	}
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<h3 class="text-lg font-semibold">Certificaciones Pendientes</h3>
			<Badge variant={pendingFiles.length > 0 ? 'destructive' : 'secondary'}>
				{pendingFiles.length}
			</Badge>
		</div>
		<Button
			variant="outline"
			size="sm"
			disabled={pendingFiles.length === 0}
			onclick={() => (confirmOpen = true)}
		>
			<Mail class="mr-2 h-4 w-4" />
			Enviar Certificaciones
		</Button>
	</div>

	{#if pendingFiles.length === 0}
		<p class="text-sm text-muted-foreground">
			No hay certificaciones pendientes de envio.
		</p>
	{:else}
		<div class="space-y-2">
			{#each pendingFiles as cert}
				<div class="flex items-center justify-between rounded-md border p-3">
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium">{cert.filename}</p>
						<p class="text-xs text-muted-foreground">
							Subido: {cert.uploaded_at
								? new Date(cert.uploaded_at).toLocaleDateString('es-AR')
								: '-'}
						</p>
					</div>
					<Badge variant="outline">Pendiente</Badge>
				</div>
			{/each}
		</div>
	{/if}

	{#if resultMessage}
		<div class="rounded-md border border-green-200 bg-green-50 p-3">
			<p class="text-sm text-green-800">{resultMessage}</p>
		</div>
	{/if}
</div>

<!-- Confirmation dialog -->
<Dialog.Dialog bind:open={confirmOpen}>
	<Dialog.DialogContent class="sm:max-w-md">
		<Dialog.DialogHeader>
			<Dialog.DialogTitle>Confirmar envio de certificaciones</Dialog.DialogTitle>
			<Dialog.DialogDescription>
				Esta accion enviara emails a los clientes con sus certificaciones. Esta accion no se puede deshacer.
			</Dialog.DialogDescription>
		</Dialog.DialogHeader>

		<div class="space-y-3 py-4">
			<div class="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
				<AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
				<div>
					<p class="text-sm font-medium text-amber-800">Atencion</p>
					<p class="text-xs text-amber-700">
						Se enviaran {pendingFiles.length} certificacion(es) por email. Asegurate de
						que los clientes tienen email configurado.
					</p>
				</div>
			</div>

			<div class="max-h-48 space-y-1 overflow-y-auto">
				{#each pendingFiles as cert}
					<div class="flex items-center gap-2 text-sm">
						<Mail class="h-3.5 w-3.5 text-muted-foreground" />
						<span class="truncate">{cert.filename}</span>
					</div>
				{/each}
			</div>
		</div>

		<Dialog.DialogFooter>
			<Button
				variant="outline"
				onclick={() => (confirmOpen = false)}
				disabled={sending}
			>
				Cancelar
			</Button>
			<Button
				onclick={handleSend}
				disabled={sending}
			>
				{#if sending}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Enviando...
				{:else}
					<Mail class="mr-2 h-4 w-4" />
					Confirmar envio
				{/if}
			</Button>
		</Dialog.DialogFooter>
	</Dialog.DialogContent>
</Dialog.Dialog>
