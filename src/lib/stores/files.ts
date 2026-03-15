import { writable } from 'svelte/store';
import { createSupabaseBrowserClient } from '$lib/services/supabase';
import { toastError } from '$lib/stores/toast';

const supabase = createSupabaseBrowserClient();

export interface FileRecord {
	id: string;
	filename: string;
	storage_path: string;
	file_type: string;
	status: string;
	processed: boolean | null;
	processed_at: string | null;
	uploaded_at: string | null;
	client_id: string | null;
	invoice_number: string | null;
}

export const filesList = writable<FileRecord[]>([]);
export const filesLoading = writable(false);

export async function fetchFiles(params?: {
	fileType?: string;
	processed?: boolean;
	status?: string;
}) {
	filesLoading.set(true);
	let query = supabase
		.from('files')
		.select('*')
		.order('uploaded_at', { ascending: false });

	if (params?.fileType) query = query.eq('file_type', params.fileType);
	if (params?.processed !== undefined) query = query.eq('processed', params.processed);
	if (params?.status) query = query.eq('status', params.status);

	const { data, error } = await query;
	if (error) {
		console.error('Error fetching files:', error);
		toastError('Error al cargar archivos');
	}
	filesList.set(data ?? []);
	filesLoading.set(false);
}

export async function uploadFile(file: File, fileType: string, country: string) {
	// Use previous month as the billing period (files are typically uploaded for the previous month)
	const now = new Date();
	const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const yearMonth = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
	const storagePath = `${fileType}/${country}/${yearMonth}/${file.name}`;

	// Upload to Supabase Storage
	const { error: uploadError } = await supabase.storage
		.from('uploads')
		.upload(storagePath, file, { upsert: true });

	if (uploadError) throw uploadError;

	// Record in files table via RPC
	const { data, error: dbError } = await supabase.rpc('handle_file_upload', {
		p_filename: file.name,
		p_file_type: fileType,
		p_storage_path: storagePath
	});

	if (dbError) throw dbError;
	return data;
}

export async function downloadFile(file: FileRecord) {
	const { data, error } = await supabase.storage
		.from('uploads')
		.download(file.storage_path);

	if (error) throw error;

	// Create download link
	const url = URL.createObjectURL(data);
	const a = document.createElement('a');
	a.href = url;
	a.download = file.filename;
	a.click();
	URL.revokeObjectURL(url);
}

export async function softDeleteFile(fileId: string) {
	const { error } = await supabase.rpc('soft_delete_file', { p_file_id: fileId });
	if (error) throw error;
}

export async function markFileProcessed(fileId: string, processed: boolean) {
	const { error } = await supabase
		.from('files')
		.update({
			processed,
			processed_at: processed ? new Date().toISOString() : null
		})
		.eq('id', fileId);
	if (error) throw error;
}
