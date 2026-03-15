import { writable } from 'svelte/store';
import { createSupabaseBrowserClient } from '$lib/services/supabase';
import type { User, Session } from '@supabase/supabase-js';

const supabase = createSupabaseBrowserClient();

export const user = writable<User | null>(null);
export const session = writable<Session | null>(null);

export async function signIn(username: string, password: string) {
	const email = `${username}@crossmediaplay.com`;
	const { data, error } = await supabase.auth.signInWithPassword({ email, password });
	if (error) throw error;
	user.set(data.user);
	session.set(data.session);
	return data;
}

export async function signOut() {
	await supabase.auth.signOut();
	user.set(null);
	session.set(null);
}
