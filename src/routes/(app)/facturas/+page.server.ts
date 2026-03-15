import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [clientsRes, agenciesRes, channelsRes] = await Promise.all([
		locals.supabase.from('clients').select('id, name, country').order('name'),
		locals.supabase.from('agencies').select('id, name, country').order('name'),
		locals.supabase.from('invoices').select('channel').not('channel', 'is', null)
	]);

	const channels = [
		...new Set(channelsRes.data?.map((c) => c.channel).filter(Boolean) ?? [])
	].sort() as string[];

	return { clients: clientsRes.data ?? [], agencies: agenciesRes.data ?? [], channels };
};
