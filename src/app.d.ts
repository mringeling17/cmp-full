import type { SupabaseClient, Session, User } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient<Database>;
			session: Session | null;
			user: User | null;
			allowedCountries: string[] | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
