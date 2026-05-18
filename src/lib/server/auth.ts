import { json } from '@sveltejs/kit';

interface MaybeUser {
	app_metadata?: Record<string, unknown> | null;
}

/** True when the given user has the admin role. */
export function isAdmin(user: MaybeUser | null | undefined): boolean {
	return user?.app_metadata?.role === 'admin';
}

/**
 * Guard for API route handlers. Returns a 401 JSON `Response` when the
 * request is not an authenticated admin, or `null` when access is allowed.
 *
 * Usage:
 *   const denied = requireAdmin(locals);
 *   if (denied) return denied;
 */
export function requireAdmin(locals: { user?: MaybeUser | null }): Response | null {
	if (!locals.user || !isAdmin(locals.user)) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
	return null;
}
