/** Centralized magic numbers / fixed strings shared across the app. */

/** Valid billing-period year bounds. */
export const MIN_YEAR = 2020;
export const MAX_YEAR = 2100;

/** Supabase Storage bucket that holds uploaded and processed files. */
export const STORAGE_BUCKET = 'uploads';

/** Folder prefix (inside the bucket) for generated output files. */
export const PROCESSED_PREFIX = 'processed/';

/** Max upload size for user-provided Excel files (10 MB). */
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

/** Fixed Xubio document number used in generated billing/credit-note rows. */
export const XUBIO_DOC_NUMBER = 'A-00002-00000000';
