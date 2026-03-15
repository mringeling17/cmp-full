import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export function createAdminClient() {
	const key = env.SUPABASE_SERVICE_ROLE_KEY || PUBLIC_SUPABASE_ANON_KEY;
	return createClient(PUBLIC_SUPABASE_URL, key);
}
