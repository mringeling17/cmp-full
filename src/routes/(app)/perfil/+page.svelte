<script lang="ts">
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';

	let loading = $state(false);
	let success = $state(false);

	let userEmail = $derived($page.data?.session?.user?.email ?? '');
</script>

<div class="mx-auto max-w-md">
	<Card>
		<CardHeader>
			<CardTitle>Cambiar contraseña</CardTitle>
			<CardDescription>{userEmail}</CardDescription>
		</CardHeader>
		<CardContent>
			{#if success}
				<div class="rounded-md bg-green-50 dark:bg-green-950 p-4 text-sm text-green-700 dark:text-green-300">
					Contraseña actualizada correctamente.
				</div>
			{:else}
				<form
					method="POST"
					action="?/changePassword"
					use:enhance={() => {
						loading = true;
						success = false;
						return async ({ result, update }) => {
							loading = false;
							if (result.type === 'success') {
								success = true;
							} else {
								await update();
							}
						};
					}}
					class="flex flex-col gap-4"
				>
					<div class="flex flex-col gap-2">
						<Label for="currentPassword">Contraseña actual</Label>
						<Input
							id="currentPassword"
							name="currentPassword"
							type="password"
							required
							autocomplete="current-password"
						/>
					</div>

					<div class="flex flex-col gap-2">
						<Label for="newPassword">Nueva contraseña</Label>
						<Input
							id="newPassword"
							name="newPassword"
							type="password"
							required
							minlength={8}
							autocomplete="new-password"
						/>
					</div>

					<div class="flex flex-col gap-2">
						<Label for="confirmPassword">Confirmar nueva contraseña</Label>
						<Input
							id="confirmPassword"
							name="confirmPassword"
							type="password"
							required
							minlength={8}
							autocomplete="new-password"
						/>
					</div>

					{#if $page.form?.error}
						<p class="text-sm text-destructive">{$page.form.error}</p>
					{/if}

					<Button type="submit" class="w-full" disabled={loading}>
						{#if loading}
							Actualizando...
						{:else}
							Cambiar contraseña
						{/if}
					</Button>
				</form>
			{/if}
		</CardContent>
	</Card>
</div>
