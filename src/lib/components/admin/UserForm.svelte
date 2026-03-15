<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Loader2 } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import type { AdminUser } from './UserList.svelte';

	let {
		open = $bindable(false),
		editUser = null
	}: {
		open: boolean;
		editUser?: AdminUser | null;
	} = $props();

	const isEdit = $derived(editUser !== null);
	const formAction = $derived(isEdit ? '?/updateRole' : '?/create');

	let username = $state('');
	let password = $state('');
	let role = $state('user');
	let saving = $state(false);
	let formError = $state('');

	// Sync form when editUser changes
	$effect(() => {
		if (editUser) {
			username = editUser.email.replace('@crossmediaplay.com', '');
			password = '';
			role = editUser.role;
		} else {
			resetForm();
		}
	});

	function resetForm() {
		username = '';
		password = '';
		role = 'user';
		saving = false;
		formError = '';
	}

	function handleOpenChange(isOpen: boolean) {
		open = isOpen;
		if (!isOpen) resetForm();
	}
</script>

<Dialog.Dialog {open} onOpenChange={handleOpenChange}>
	<Dialog.DialogContent class="sm:max-w-md">
		<Dialog.DialogHeader>
			<Dialog.DialogTitle>{isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</Dialog.DialogTitle>
			<Dialog.DialogDescription>
				{isEdit
					? `Editar el rol de ${editUser?.email}`
					: 'Crear un nuevo usuario para la plataforma'}
			</Dialog.DialogDescription>
		</Dialog.DialogHeader>

		<form
			method="POST"
			action={formAction}
			use:enhance={() => {
				saving = true;
				formError = '';
				return async ({ result, update }) => {
					saving = false;
					if (result.type === 'success' && result.data?.success) {
						open = false;
						resetForm();
					} else if (result.type === 'success' && result.data?.error) {
						formError = result.data.error as string;
					} else if (result.type === 'failure') {
						formError = 'Error al procesar la solicitud';
					}
					await update();
				};
			}}
		>
			{#if isEdit}
				<input type="hidden" name="userId" value={editUser?.id} />
			{/if}

			<div class="space-y-4 py-2">
				{#if !isEdit}
					<div>
						<Label for="admin-username" class="mb-1.5">Usuario</Label>
						<div class="flex items-center gap-1">
							<Input
								id="admin-username"
								name="username"
								placeholder="nombre.apellido"
								bind:value={username}
								autocomplete="off"
								autofocus
								required
							/>
							<span class="text-muted-foreground shrink-0 text-sm">@crossmediaplay.com</span>
						</div>
					</div>

					<div>
						<Label for="admin-password" class="mb-1.5">Contrasena</Label>
						<Input
							id="admin-password"
							name="password"
							type="password"
							placeholder="Minimo 6 caracteres"
							bind:value={password}
							autocomplete="new-password"
							required
							minlength={6}
						/>
					</div>
				{/if}

				<div>
					<Label class="mb-1.5">Rol</Label>
					<Select.Select
						type="single"
						name="role"
						value={role}
						onValueChange={(v) => {
							if (v) role = v;
						}}
					>
						<Select.SelectTrigger class="w-full">
							{#snippet children()}
								<span>{role === 'admin' ? 'Admin' : 'Usuario'}</span>
							{/snippet}
						</Select.SelectTrigger>
						<Select.SelectContent>
							<Select.SelectItem value="user">Usuario</Select.SelectItem>
							<Select.SelectItem value="admin">Admin</Select.SelectItem>
						</Select.SelectContent>
					</Select.Select>
					<!-- Hidden input to submit the select value -->
					<input type="hidden" name="role" value={role} />
				</div>

				{#if formError}
					<p class="text-destructive text-sm">{formError}</p>
				{/if}
			</div>

			<Dialog.DialogFooter class="mt-4">
				<Button
					variant="outline"
					type="button"
					onclick={() => handleOpenChange(false)}
					disabled={saving}
				>
					Cancelar
				</Button>
				<Button
					type="submit"
					disabled={saving || (!isEdit && (!username.trim() || !password.trim()))}
				>
					{#if saving}
						<Loader2 class="mr-2 size-4 animate-spin" />
					{/if}
					{isEdit ? 'Guardar' : 'Crear usuario'}
				</Button>
			</Dialog.DialogFooter>
		</form>
	</Dialog.DialogContent>
</Dialog.Dialog>
