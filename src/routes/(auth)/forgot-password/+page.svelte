<script lang="ts">
	import { enhance } from '$app/forms';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';

	let username = $state('');
	let loading = $state(false);
	let submitted = $state(false);
</script>

<Card class="w-full max-w-sm">
	<CardHeader class="text-center">
		<CardTitle class="text-2xl">Restablecer contraseña</CardTitle>
		<CardDescription>
			{#if submitted}
				Revisa tu correo electronico
			{:else}
				Ingresa tu usuario para recibir un enlace de restablecimiento
			{/if}
		</CardDescription>
	</CardHeader>
	<CardContent>
		{#if submitted}
			<div class="flex flex-col gap-4 text-center">
				<p class="text-sm text-muted-foreground">
					Si el usuario existe, recibiras un correo con instrucciones para restablecer tu contraseña.
				</p>
				<a href="/login" class="text-sm text-primary hover:underline">
					Volver al inicio de sesion
				</a>
			</div>
		{:else}
			<form
				method="POST"
				use:enhance={() => {
					loading = true;
					return async ({ result }) => {
						loading = false;
						if (result.type === 'success') {
							submitted = true;
						}
					};
				}}
				class="flex flex-col gap-4"
			>
				<div class="flex flex-col gap-2">
					<Label for="username">Usuario</Label>
					<div class="flex items-center gap-0">
						<Input
							id="username"
							name="username"
							type="text"
							placeholder="usuario"
							bind:value={username}
							required
							autocomplete="username"
							class="rounded-r-none border-r-0"
						/>
						<span
							class="inline-flex h-9 items-center rounded-r-md border border-input bg-muted px-3 text-sm text-muted-foreground"
						>
							@crossmediaplay.com
						</span>
					</div>
				</div>

				<Button type="submit" class="w-full" disabled={loading || !username.trim()}>
					{#if loading}
						Enviando...
					{:else}
						Enviar enlace
					{/if}
				</Button>

				<a href="/login" class="text-center text-sm text-muted-foreground hover:underline">
					Volver al inicio de sesion
				</a>
			</form>
		{/if}
	</CardContent>
</Card>
