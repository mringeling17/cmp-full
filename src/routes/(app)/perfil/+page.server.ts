import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	changePassword: async ({ request, locals }) => {
		const formData = await request.formData();
		const currentPassword = formData.get('currentPassword') as string;
		const newPassword = formData.get('newPassword') as string;
		const confirmPassword = formData.get('confirmPassword') as string;

		if (!currentPassword || !newPassword || !confirmPassword) {
			return fail(400, { error: 'Todos los campos son requeridos' });
		}

		if (newPassword.length < 8) {
			return fail(400, { error: 'La nueva contraseña debe tener al menos 8 caracteres' });
		}

		if (newPassword !== confirmPassword) {
			return fail(400, { error: 'Las contraseñas no coinciden' });
		}

		// Verify current password
		const email = locals.session?.user?.email;
		if (!email) {
			return fail(401, { error: 'No autenticado' });
		}

		const { error: signInError } = await locals.supabase.auth.signInWithPassword({
			email,
			password: currentPassword
		});

		if (signInError) {
			return fail(400, { error: 'La contraseña actual es incorrecta' });
		}

		// Update password
		const { error: updateError } = await locals.supabase.auth.updateUser({
			password: newPassword
		});

		if (updateError) {
			return fail(500, { error: 'Error al actualizar la contraseña' });
		}

		return { success: true };
	}
};
