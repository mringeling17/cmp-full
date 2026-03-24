<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Search, Plus, Pencil, Trash2, Shield, ShieldCheck, Loader2 } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { COUNTRIES } from '$lib/stores/country';

	export interface AdminUser {
		id: string;
		email: string;
		created_at: string;
		last_sign_in_at: string | null;
		role: string;
		email_confirmed_at: string | null;
		allowed_countries: string[] | null;
	}

	let {
		users,
		currentUserId,
		onCreateClick,
		onEditClick,
		actionResult
	}: {
		users: AdminUser[];
		currentUserId: string;
		onCreateClick: () => void;
		onEditClick: (user: AdminUser) => void;
		actionResult: { success: boolean; error?: string; action?: string } | null;
	} = $props();

	let search = $state('');
	let deletingId = $state<string | null>(null);

	const filtered = $derived(
		users.filter((u) => u.email.toLowerCase().includes(search.toLowerCase()))
	);

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return 'Nunca';
		const d = new Date(dateStr);
		return d.toLocaleDateString('es-AR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (role) {
			case 'admin':
				return 'default';
			default:
				return 'secondary';
		}
	}

	function getRoleLabel(role: string): string {
		switch (role) {
			case 'admin':
				return 'Admin';
			case 'user':
				return 'Usuario';
			default:
				return role;
		}
	}

	function getCountryFlag(code: string): string {
		return COUNTRIES[code as keyof typeof COUNTRIES]?.flag ?? code;
	}
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="flex items-center gap-2 border-b p-3">
		<div class="relative flex-1">
			<Search class="text-muted-foreground absolute left-2.5 top-2.5 size-4" />
			<Input placeholder="Buscar usuario..." class="pl-8" bind:value={search} />
		</div>
		<Button size="sm" onclick={onCreateClick}>
			<Plus class="mr-1 size-4" />
			Nuevo
		</Button>
	</div>

	<!-- User list -->
	<div class="flex-1 overflow-y-auto">
		{#if filtered.length === 0}
			<div class="text-muted-foreground p-4 text-center text-sm">
				{search ? 'No se encontraron usuarios' : 'No hay usuarios'}
			</div>
		{:else}
			<div class="divide-y">
				{#each filtered as user (user.id)}
					<div class="flex items-center justify-between px-4 py-3 transition-colors hover:bg-accent/50">
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<span class="truncate text-sm font-medium">{user.email}</span>
								<Badge variant={getRoleBadgeVariant(user.role)} class="shrink-0">
									{#if user.role === 'admin'}
										<ShieldCheck class="mr-1 size-3" />
									{:else}
										<Shield class="mr-1 size-3" />
									{/if}
									{getRoleLabel(user.role)}
								</Badge>
								{#if user.id === currentUserId}
									<Badge variant="outline" class="shrink-0 text-xs">Tu</Badge>
								{/if}
							</div>
							<div class="text-muted-foreground mt-0.5 flex gap-3 text-xs">
								<span>Creado: {formatDate(user.created_at)}</span>
								<span>Ultimo acceso: {formatDate(user.last_sign_in_at)}</span>
								<span class="flex items-center gap-1">
									{#if user.allowed_countries}
										{#each user.allowed_countries as code}
											<span title={COUNTRIES[code as keyof typeof COUNTRIES]?.name ?? code}>{getCountryFlag(code)}</span>
										{/each}
									{:else}
										<span title="Todos los paises">🌎</span>
									{/if}
								</span>
							</div>
						</div>

						<div class="ml-2 flex shrink-0 items-center gap-1">
							<Button
								size="sm"
								variant="ghost"
								class="size-8 p-0"
								title="Editar usuario"
								onclick={() => onEditClick(user)}
							>
								<Pencil class="size-3.5" />
							</Button>

							{#if user.id !== currentUserId}
								<form
									method="POST"
									action="?/delete"
									use:enhance={() => {
										deletingId = user.id;
										return async ({ update }) => {
											deletingId = null;
											await update();
										};
									}}
								>
									<input type="hidden" name="userId" value={user.id} />
									<Button
										type="submit"
										size="sm"
										variant="ghost"
										class="size-8 p-0 text-destructive hover:text-destructive"
										title="Eliminar usuario"
										disabled={deletingId === user.id}
										onclick={(e) => {
											if (!confirm(`Eliminar usuario ${user.email}?`)) {
												e.preventDefault();
											}
										}}
									>
										{#if deletingId === user.id}
											<Loader2 class="size-3.5 animate-spin" />
										{:else}
											<Trash2 class="size-3.5" />
										{/if}
									</Button>
								</form>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Summary -->
	<div class="text-muted-foreground border-t px-4 py-2 text-xs">
		{filtered.length} de {users.length} usuario{users.length !== 1 ? 's' : ''}
	</div>
</div>
