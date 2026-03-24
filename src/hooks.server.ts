import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Handle } from '@sveltejs/kit';
import type { Database } from '$lib/types/database';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient<Database>(
		PUBLIC_SUPABASE_URL,
		PUBLIC_SUPABASE_ANON_KEY,
		{
			cookies: {
				getAll: () => event.cookies.getAll(),
				setAll: (cookiesToSet) => {
					cookiesToSet.forEach(({ name, value, options }) => {
						event.cookies.set(name, value, { ...options, path: '/' });
					});
				}
			}
		}
	);

	const {
		data: { user }
	} = await event.locals.supabase.auth.getUser();
	event.locals.user = user;

	// Derive session only if user is authenticated (avoids getSession() insecurity warning)
	if (user) {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		event.locals.session = session;

		// Fetch country restrictions from user_profiles
		const { createAdminClient } = await import('$lib/services/supabase-admin');
		const adminClient = createAdminClient();

		if (user.app_metadata?.role === 'admin') {
			event.locals.allowedCountries = null; // null = all countries
		} else {
			const { data: profile } = await adminClient
				.from('user_profiles')
				.select('allowed_countries')
				.eq('id', user.id)
				.maybeSingle();

			event.locals.allowedCountries = profile?.allowed_countries ?? null;
		}
	} else {
		event.locals.session = null;
		event.locals.allowedCountries = null;
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
