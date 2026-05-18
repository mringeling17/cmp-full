import { randomBytes } from 'crypto';
import type { Actions } from './$types';
import { createAdminClient } from '$lib/services/supabase-admin';
import { sendPasswordResetEmail } from '$lib/services/email';
import {
	EMAIL_DOMAIN,
	PASSWORD_RESET_TOKEN_TTL_MS,
	USER_LIST_PAGE_SIZE
} from '$lib/config/constants';

export const actions: Actions = {
	default: async ({ request, url }) => {
		const formData = await request.formData();
		const username = (formData.get('username') as string)?.trim();

		if (!username) {
			return { success: true }; // Don't reveal validation details
		}

		const email = username.includes('@') ? username : `${username}@${EMAIL_DOMAIN}`;

		try {
			const adminClient = createAdminClient();

			// Find user by email (perPage: 1000 to handle larger user bases)
			const {
				data: { users }
			} = await adminClient.auth.admin.listUsers({ perPage: USER_LIST_PAGE_SIZE });

			const user = users?.find((u) => u.email === email);

			if (!user) {
				// Don't reveal that the user doesn't exist
				return { success: true };
			}

			// Generate secure token
			const token = randomBytes(32).toString('hex');
			const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS).toISOString();

			// Store token
			await adminClient.from('password_reset_tokens').insert({
				user_id: user.id,
				token,
				expires_at: expiresAt
			});

			// Send email
			const resetUrl = `${url.origin}/reset-password?token=${token}`;
			await sendPasswordResetEmail(email, resetUrl);
		} catch {
			// Silently fail - don't reveal errors to prevent enumeration
		}

		return { success: true };
	}
};
