<script lang="ts">
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';

	const token = $derived($page.url.searchParams.get('token') ?? '');

	let password = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let error = $state('');
	let success = $state(false);

	const passwordsMatch = $derived(password === confirmPassword);
	const isValid = $derived(password.length >= 6 && passwordsMatch);
</script>

<Card class="w-full max-w-sm">
	<CardHeader class="text-center">
		<CardTitle class="text-2xl">Nueva contraseña</CardTitle>
		<CardDescription>
			{#if success}
				Contraseña actualizada correctamente
			{:else if !token}
				Enlace invalido
			{:else}
				Ingresa tu nueva contraseña
			{/if}
		</CardDescription>
	</CardHeader>
	<CardContent>
		{#if success}
			<div class="flex flex-col gap-4 text-center">
				<p class="text-sm text-muted-foreground">
					Ya podes iniciar sesion con tu nueva contraseña.
				</p>
				<a href="/login" class="text-sm text-primary hover:underline">
					Ir al inicio de sesion
				</a>
			</div>
		{:else if !token}
			<div class="flex flex-col gap-4 text-center">
				<p class="text-sm text-muted-foreground">
					El enlace no es valido. Solicita uno nuevo.
				</p>
				<a href="/forgot-password" class="text-sm text-primary hover:underline">
					Solicitar nuevo enlace
				</a>
			</div>
		{:else}
			<form
				method="POST"
				use:enhance={() => {
					loading = true;
					error = '';
					return async ({ result }) => {
						loading = false;
						if (result.type === 'success' && result.data?.success) {
							success = true;
						} else if (result.type === 'success' && result.data?.error) {
							error = result.data.error as string;
						}
					};
				}}
				class="flex flex-col gap-4"
			>
				<input type="hidden" name="token" value={token} />

				<div class="flex flex-col gap-2">
					<Label for="password">Nueva contraseña</Label>
					<Input
						id="password"
						name="password"
						type="password"
						placeholder="Minimo 6 caracteres"
						bind:value={password}
						required
						minlength={6}
						autocomplete="new-password"
					/>
				</div>

				<div class="flex flex-col gap-2">
					<Label for="confirmPassword">Confirmar contraseña</Label>
					<Input
						id="confirmPassword"
						type="password"
						placeholder="Repeti la contraseña"
						bind:value={confirmPassword}
						required
						minlength={6}
						autocomplete="new-password"
					/>
					{#if confirmPassword && !passwordsMatch}
						<p class="text-sm text-destructive">Las contraseñas no coinciden</p>
					{/if}
				</div>

				{#if error}
					<p class="text-sm text-destructive">{error}</p>
				{/if}

				<Button type="submit" class="w-full" disabled={loading || !isValid}>
					{#if loading}
						Actualizando...
					{:else}
						Actualizar contraseña
					{/if}
				</Button>
			</form>
		{/if}
	</CardContent>
</Card>
