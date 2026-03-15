import { error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createAdminClient } from '$lib/services/supabase-admin';

function getAdminClient() {
	return createAdminClient();
}

function isUserAdmin(user: { app_metadata?: Record<string, unknown> } | null): boolean {
	return user?.app_metadata?.role === 'admin';
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, 'No autenticado');
	}

	if (!isUserAdmin(locals.user)) {
		throw error(403, 'Acceso denegado. Solo administradores pueden acceder a esta pagina.');
	}

	const adminClient = getAdminClient();

	const {
		data: { users },
		error: listError
	} = await adminClient.auth.admin.listUsers({ perPage: 100 });

	if (listError) {
		throw error(500, `Error al listar usuarios: ${listError.message}`);
	}

	// Serialize users for the client
	const serializedUsers = (users ?? []).map((u) => ({
		id: u.id,
		email: u.email ?? '',
		created_at: u.created_at,
		last_sign_in_at: u.last_sign_in_at ?? null,
		role: (u.app_metadata?.role as string) ?? 'user',
		email_confirmed_at: u.email_confirmed_at ?? null
	}));

	return {
		users: serializedUsers,
		currentUserId: locals.user.id
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user || !isUserAdmin(locals.user)) {
			throw error(403, 'Acceso denegado');
		}

		const formData = await request.formData();
		const username = (formData.get('username') as string)?.trim();
		const password = (formData.get('password') as string)?.trim();
		const role = (formData.get('role') as string)?.trim() || 'user';

		if (!username || !password) {
			return { success: false, error: 'Usuario y contrasena son requeridos', action: 'create' };
		}

		const email = username.includes('@') ? username : `${username}@crossmediaplay.com`;

		if (password.length < 6) {
			return {
				success: false,
				error: 'La contrasena debe tener al menos 6 caracteres',
				action: 'create'
			};
		}

		const adminClient = getAdminClient();

		const { error: createError } = await adminClient.auth.admin.createUser({
			email,
			password,
			email_confirm: true,
			app_metadata: { role }
		});

		if (createError) {
			return { success: false, error: createError.message, action: 'create' };
		}

		return { success: true, action: 'create' };
	},

	updateRole: async ({ request, locals }) => {
		if (!locals.user || !isUserAdmin(locals.user)) {
			throw error(403, 'Acceso denegado');
		}

		const formData = await request.formData();
		const userId = formData.get('userId') as string;
		const role = formData.get('role') as string;

		if (!userId || !role) {
			return { success: false, error: 'Datos incompletos', action: 'updateRole' };
		}

		const adminClient = getAdminClient();

		const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
			app_metadata: { role }
		});

		if (updateError) {
			return { success: false, error: updateError.message, action: 'updateRole' };
		}

		return { success: true, action: 'updateRole' };
	},

	delete: async ({ request, locals }) => {
		if (!locals.user || !isUserAdmin(locals.user)) {
			throw error(403, 'Acceso denegado');
		}

		const formData = await request.formData();
		const userId = formData.get('userId') as string;

		if (!userId) {
			return { success: false, error: 'ID de usuario requerido', action: 'delete' };
		}

		if (userId === locals.user.id) {
			return { success: false, error: 'No puedes eliminarte a ti mismo', action: 'delete' };
		}

		const adminClient = getAdminClient();

		const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

		if (deleteError) {
			return { success: false, error: deleteError.message, action: 'delete' };
		}

		return { success: true, action: 'delete' };
	}
};
