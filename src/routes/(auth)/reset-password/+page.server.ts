import type { Actions } from './$types';
import { createAdminClient } from '$lib/services/supabase-admin';

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const token = (formData.get('token') as string)?.trim();
		const password = (formData.get('password') as string)?.trim();

		if (!token || !password) {
			return { success: false, error: 'Datos incompletos' };
		}

		if (password.length < 6) {
			return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' };
		}

		const adminClient = createAdminClient();

		// Look up the token
		const { data: tokenRow, error: tokenError } = await adminClient
			.from('password_reset_tokens')
			.select('*')
			.eq('token', token)
			.eq('used', false)
			.single();

		if (tokenError || !tokenRow) {
			return { success: false, error: 'El enlace es invalido o ya fue utilizado' };
		}

		// Check expiration
		if (new Date(tokenRow.expires_at) < new Date()) {
			return { success: false, error: 'El enlace ha expirado. Solicita uno nuevo.' };
		}

		// Update password
		const { error: updateError } = await adminClient.auth.admin.updateUserById(
			tokenRow.user_id,
			{ password }
		);

		if (updateError) {
			return { success: false, error: 'Error al actualizar la contraseña. Intenta nuevamente.' };
		}

		// Mark token as used
		await adminClient
			.from('password_reset_tokens')
			.update({ used: true })
			.eq('id', tokenRow.id);

		return { success: true };
	}
};
