import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const GET: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('authorization');
	const cronSecret = env.CRON_SECRET;

	if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
	const { data, error } = await supabase.rpc('keepalive');

	if (error) {
		// Fallback: simple query if the RPC doesn't exist
		const { data: fallbackData, error: fallbackError } = await supabase
			.from('agencies')
			.select('id')
			.limit(1);

		if (fallbackError) {
			return json({ success: false, error: 'DB unreachable' }, { status: 500 });
		}

		return json({ success: true, result: 1, timestamp: new Date().toISOString() });
	}

	return json({ success: true, result: data, timestamp: new Date().toISOString() });
};
