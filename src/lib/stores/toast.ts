import { toast } from 'svelte-sonner';

/**
 * Convenience wrappers around svelte-sonner's toast.
 * Pages and components can still use `toast` from svelte-sonner directly.
 */

export function toastSuccess(message: string) {
	toast.success(message);
}

export function toastError(message: string) {
	toast.error(message);
}

/**
 * Show a loading toast. Returns the toast id so it can be dismissed later
 * via `toast.dismiss(id)` or updated via `toast.success(message, { id })`.
 */
export function toastLoading(message: string): string | number {
	return toast.loading(message);
}
