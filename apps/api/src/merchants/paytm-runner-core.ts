/**
 * PayTM thin runners (vendored TP_PAYTM_*.py) all follow the same call shape:
 *   <module>.login(); navigate_to_transactions(); main_loop('<profile>')
 * The *filename* (TXN vs NAME) tells ops which anchor fields the portal flow expects.
 */

export type PaytmThinScriptKind = 'txn' | 'name' | 'unknown';

export function inferPaytmThinScriptKind(
  relativePath: string,
): PaytmThinScriptKind {
  const base = relativePath.trim().split(/[/\\]/).pop() ?? '';
  const u = base.toUpperCase();
  if (u.includes('_NAME_') || /^TP_PAYTM_NAME_/i.test(base)) return 'name';
  if (u.startsWith('TP_PAYTM_TXN_') || u.includes('_TXN_')) return 'txn';
  return 'unknown';
}

/** Maps recognized thin script names to operator form mode (matches b_auto TP_PAYTM_* patterns). */
export function anchorModeForPaytmThinScript(
  relativePath: string,
): 'txn' | 'name' | null {
  const k = inferPaytmThinScriptKind(relativePath);
  if (k === 'txn') return 'txn';
  if (k === 'name') return 'name';
  return null;
}
