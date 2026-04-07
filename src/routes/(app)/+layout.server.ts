import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

const ADMIN_ONLY_PATHS = ['/facturas', '/pagos', '/cobranzas', '/clientes', '/archivos', '/admin'];

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.session) {
		throw redirect(303, '/login');
	}

	const isAdmin = locals.session.user?.app_metadata?.role === 'admin';

	if (!isAdmin && ADMIN_ONLY_PATHS.some((p) => url.pathname === p || url.pathname.startsWith(p + '/'))) {
		throw redirect(303, '/dashboard');
	}

	return {
		session: locals.session,
		user: locals.user,
		allowedCountries: locals.allowedCountries
	};
};
