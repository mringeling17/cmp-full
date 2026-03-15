<script lang="ts">
	import UserList from '$lib/components/admin/UserList.svelte';
	import UserForm from '$lib/components/admin/UserForm.svelte';
	import type { AdminUser } from '$lib/components/admin/UserList.svelte';
	import { Shield } from '@lucide/svelte';

	let { data, form } = $props();

	let formOpen = $state(false);
	let editUser = $state<AdminUser | null>(null);

	function handleCreateClick() {
		editUser = null;
		formOpen = true;
	}

	function handleEditClick(user: AdminUser) {
		editUser = user;
		formOpen = true;
	}
</script>

<div class="flex h-[calc(100vh-7rem)] flex-col lg:h-[calc(100vh-5rem)]">
	<!-- Header -->
	<div class="mb-4 flex items-center gap-3">
		<Shield class="text-muted-foreground size-6" />
		<div>
			<h1 class="text-2xl font-bold">Administracion</h1>
			<p class="text-muted-foreground text-sm">Gestion de usuarios de la plataforma</p>
		</div>
	</div>

	<!-- Error/success feedback from form actions -->
	{#if form && !form.success && form.error}
		<div class="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
			{form.error}
		</div>
	{/if}

	<!-- User list panel -->
	<div class="flex-1 overflow-hidden rounded-lg border">
		<UserList
			users={data.users}
			currentUserId={data.currentUserId}
			onCreateClick={handleCreateClick}
			onEditClick={handleEditClick}
			actionResult={form}
		/>
	</div>

	<!-- Create/Edit dialog -->
	<UserForm bind:open={formOpen} {editUser} />
</div>
