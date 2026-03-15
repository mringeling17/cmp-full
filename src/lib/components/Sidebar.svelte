<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { signOut } from '$lib/stores/auth';
	import { cn } from '$lib/utils';
	import CountrySelector from './CountrySelector.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import * as Sheet from '$lib/components/ui/sheet';
	import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import CreditCardIcon from '@lucide/svelte/icons/credit-card';
	import TrendingUpIcon from '@lucide/svelte/icons/trending-up';
	import UsersIcon from '@lucide/svelte/icons/users';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import PanelLeftCloseIcon from '@lucide/svelte/icons/panel-left-close';
	import PanelLeftOpenIcon from '@lucide/svelte/icons/panel-left-open';
	import MenuIcon from '@lucide/svelte/icons/menu';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import { toggleMode, mode } from 'mode-watcher';

	interface NavItem {
		href: string;
		label: string;
		icon: typeof LayoutDashboardIcon;
		adminOnly?: boolean;
	}

	const navItems: NavItem[] = [
		{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
		{ href: '/facturas', label: 'Facturas', icon: FileTextIcon },
		{ href: '/pagos', label: 'Pagos', icon: CreditCardIcon },
		{ href: '/cobranzas', label: 'Cobranzas', icon: TrendingUpIcon },
		{ href: '/clientes', label: 'Clientes', icon: UsersIcon },
		{ href: '/archivos', label: 'Archivos', icon: FolderIcon },
		{ href: '/admin', label: 'Admin', icon: SettingsIcon, adminOnly: true }
	];

	let collapsed = $state(false);
	let mobileOpen = $state(false);

	// Get user data from the page store (passed via layout server load)
	let userData = $derived($page.data);
	let userEmail = $derived(userData?.session?.user?.email ?? '');
	let isAdmin = $derived(
		userData?.session?.user?.app_metadata?.role === 'admin'
	);

	let filteredNavItems = $derived(
		navItems.filter((item) => !item.adminOnly || isAdmin)
	);

	function isActive(href: string): boolean {
		return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
	}

	async function handleSignOut() {
		await signOut();
		await goto('/login');
	}

	function toggleCollapse() {
		collapsed = !collapsed;
	}
</script>

<!-- Mobile hamburger button -->
<div class="fixed top-0 left-0 z-40 flex h-14 items-center px-4 lg:hidden">
	<Sheet.Root bind:open={mobileOpen}>
		<Sheet.Trigger>
			{#snippet child({ props })}
				<Button variant="ghost" size="icon" {...props}>
					<MenuIcon class="size-5" />
					<span class="sr-only">Abrir menu</span>
				</Button>
			{/snippet}
		</Sheet.Trigger>
		<Sheet.Content side="left" class="w-72 p-0 bg-sidebar text-sidebar-foreground">
			<Sheet.Title class="sr-only">Menu de navegacion</Sheet.Title>
			<Sheet.Description class="sr-only">Navegacion principal de la aplicacion</Sheet.Description>
			<nav class="flex h-full flex-col">
				<!-- Header -->
				<div class="flex h-14 items-center px-4">
					<h1 class="text-lg font-bold tracking-tight">Finanzas CMP</h1>
				</div>

				<Separator class="bg-sidebar-border" />

				<!-- Nav links -->
				<div class="flex-1 overflow-y-auto py-2">
					{#each filteredNavItems as item (item.href)}
						{@const Icon = item.icon}
						<a
							href={item.href}
							onclick={() => (mobileOpen = false)}
							class={cn(
								'mx-2 mb-0.5 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
								isActive(item.href)
									? 'bg-sidebar-accent text-sidebar-accent-foreground'
									: 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
							)}
						>
							<Icon class="size-4 shrink-0" />
							<span>{item.label}</span>
						</a>
					{/each}
				</div>

				<Separator class="bg-sidebar-border" />

				<!-- Country selector -->
				<div class="px-2 py-2">
					<CountrySelector />
				</div>

				<Separator class="bg-sidebar-border" />

				<!-- Dark mode toggle -->
				<div class="px-2 py-2">
					<Button
						variant="ghost"
						size="sm"
						class="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
						onclick={toggleMode}
					>
						{#if mode.current === 'dark'}
							<SunIcon class="size-4" />
							<span>Modo claro</span>
						{:else}
							<MoonIcon class="size-4" />
							<span>Modo oscuro</span>
						{/if}
					</Button>
				</div>

				<Separator class="bg-sidebar-border" />

				<!-- User info -->
				<div class="p-3">
					<p class="truncate text-xs text-sidebar-foreground/60">{userEmail}</p>
					<Button
						variant="ghost"
						size="sm"
						class="mt-2 w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
						onclick={handleSignOut}
					>
						<LogOutIcon class="size-4" />
						<span>Cerrar sesion</span>
					</Button>
				</div>
			</nav>
		</Sheet.Content>
	</Sheet.Root>
</div>

<!-- Desktop sidebar -->
<aside
	class={cn(
		'hidden lg:flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300',
		collapsed ? 'w-16' : 'w-64'
	)}
>
	<!-- Header -->
	<div class="flex h-14 items-center justify-between px-4">
		{#if !collapsed}
			<h1 class="text-lg font-bold tracking-tight">Finanzas CMP</h1>
		{/if}
		<Button
			variant="ghost"
			size="icon-sm"
			class="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
			onclick={toggleCollapse}
		>
			{#if collapsed}
				<PanelLeftOpenIcon class="size-4" />
			{:else}
				<PanelLeftCloseIcon class="size-4" />
			{/if}
			<span class="sr-only">{collapsed ? 'Expandir' : 'Colapsar'} sidebar</span>
		</Button>
	</div>

	<Separator class="bg-sidebar-border" />

	<!-- Nav links -->
	<nav class="flex-1 overflow-y-auto py-2">
		{#each filteredNavItems as item (item.href)}
			{@const Icon = item.icon}
			<a
				href={item.href}
				title={collapsed ? item.label : undefined}
				class={cn(
					'mx-2 mb-0.5 flex items-center rounded-md text-sm font-medium transition-colors',
					collapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2',
					isActive(item.href)
						? 'bg-sidebar-accent text-sidebar-accent-foreground'
						: 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
				)}
			>
				<Icon class="size-4 shrink-0" />
				{#if !collapsed}
					<span>{item.label}</span>
				{/if}
			</a>
		{/each}
	</nav>

	<Separator class="bg-sidebar-border" />

	<!-- Country selector -->
	{#if !collapsed}
		<div class="px-2 py-2">
			<CountrySelector />
		</div>
		<Separator class="bg-sidebar-border" />
	{/if}

	<!-- Dark mode toggle -->
	<div class={cn('px-2 py-2', collapsed && 'flex justify-center')}>
		{#if collapsed}
			<Button
				variant="ghost"
				size="icon-sm"
				class="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
				title={mode.current === 'dark' ? 'Modo claro' : 'Modo oscuro'}
				onclick={toggleMode}
			>
				{#if mode.current === 'dark'}
					<SunIcon class="size-4" />
				{:else}
					<MoonIcon class="size-4" />
				{/if}
				<span class="sr-only">{mode.current === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
			</Button>
		{:else}
			<Button
				variant="ghost"
				size="sm"
				class="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
				onclick={toggleMode}
			>
				{#if mode.current === 'dark'}
					<SunIcon class="size-4" />
					<span>Modo claro</span>
				{:else}
					<MoonIcon class="size-4" />
					<span>Modo oscuro</span>
				{/if}
			</Button>
		{/if}
	</div>

	<Separator class="bg-sidebar-border" />

	<!-- User info -->
	<div class={cn('p-3', collapsed && 'flex flex-col items-center')}>
		{#if !collapsed}
			<p class="truncate text-xs text-sidebar-foreground/60">{userEmail}</p>
			<Button
				variant="ghost"
				size="sm"
				class="mt-2 w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
				onclick={handleSignOut}
			>
				<LogOutIcon class="size-4" />
				<span>Cerrar sesion</span>
			</Button>
		{:else}
			<Button
				variant="ghost"
				size="icon-sm"
				class="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
				title="Cerrar sesion"
				onclick={handleSignOut}
			>
				<LogOutIcon class="size-4" />
				<span class="sr-only">Cerrar sesion</span>
			</Button>
		{/if}
	</div>
</aside>
