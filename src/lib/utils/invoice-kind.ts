/** True when an invoice row represents a Nota de Crédito (NC) rather than a
 *  regular certification: an explicit credit-note document_type, or a negative
 *  net value (reversal). Centralized so UI/reports classify consistently. */
export function isCreditNote(inv: {
	document_type?: string | null;
	net_value?: number | null;
}): boolean {
	const dt = (inv.document_type ?? '').trim().toUpperCase();
	if (dt === 'NC' || dt === 'NOTA CREDITO' || dt === 'NOTA DE CREDITO' || dt === 'CREDIT NOTE') {
		return true;
	}
	return (inv.net_value ?? 0) < 0;
}
