<script lang="ts">
	import { goto } from '$app/navigation';
	import { signIn } from '$lib/stores/auth';
	import { selectedCountry } from '$lib/stores/country';
	import type { CountryCode } from '$lib/stores/country';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';

	let username = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;

		try {
			await signIn(username, password);

			// Set country before navigating
			try {
				const res = await fetch('/api/my-countries');
				const { allowedCountries } = await res.json();
				if (allowedCountries && allowedCountries.length > 0) {
					selectedCountry.set(allowedCountries[0] as CountryCode);
				}
			} catch {}

			await goto('/dashboard');
		} catch (err) {
			if (err instanceof Error) {
				error = err.message;
			} else {
				error = 'Error al iniciar sesion. Intenta nuevamente.';
			}
		} finally {
			loading = false;
		}
	}
</script>

<Card class="w-full max-w-sm">
	<CardHeader class="text-center">
		<CardTitle class="text-2xl">CMP Finance</CardTitle>
		<CardDescription>Ingresa tus credenciales para acceder</CardDescription>
	</CardHeader>
	<CardContent>
		<form onsubmit={handleSubmit} class="flex flex-col gap-4">
			<div class="flex flex-col gap-2">
				<Label for="username">Usuario</Label>
				<div class="flex items-center gap-0">
					<Input
						id="username"
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

			<div class="flex flex-col gap-2">
				<Label for="password">Contrasena</Label>
				<Input
					id="password"
					type="password"
					placeholder="********"
					bind:value={password}
					required
					autocomplete="current-password"
				/>
			</div>

			<div class="flex justify-end">
				<a href="/forgot-password" class="text-sm text-muted-foreground hover:underline">
					Olvide mi contraseña
				</a>
			</div>

			{#if error}
				<p class="text-sm text-destructive">{error}</p>
			{/if}

			<Button type="submit" class="w-full" disabled={loading}>
				{#if loading}
					Ingresando...
				{:else}
					Ingresar
				{/if}
			</Button>
		</form>
	</CardContent>
</Card>
