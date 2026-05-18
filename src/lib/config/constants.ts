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

/** Email domain used to build usernames into addresses. */
export const EMAIL_DOMAIN = 'crossmediaplay.com';

/** MIME types for Excel uploads. */
export const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const EXCEL_MIME_LEGACY = 'application/vnd.ms-excel';
export const EXCEL_UPLOAD_MIME_TYPES = [EXCEL_MIME, EXCEL_MIME_LEGACY];

/** Lookback window for pending certification files (5 days). */
export const CERT_PENDING_WINDOW_MS = 5 * 24 * 60 * 60 * 1000;

/** Password-reset token time-to-live (1 hour). */
export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/** Page size when listing auth users via the admin API. */
export const USER_LIST_PAGE_SIZE = 1000;

/** Invoice Summary Excel layout assumptions. */
export const INVOICE_SUMMARY_SHEET = 'Invoice Summary';
export const INVOICE_SUMMARY_HEADER_SKIP_ROWS = 5;
export const INVOICE_SUMMARY_DATE_FROM_CELL = 'B4';

/** Excel serial-date conversion: days between 1900 and Unix epochs, and secs/day. */
export const EXCEL_EPOCH_OFFSET_DAYS = 25569;
export const EXCEL_SECONDS_PER_DAY = 86400;
