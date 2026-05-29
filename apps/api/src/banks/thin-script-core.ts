/**
 * Thin runners (vendored TP_* scripts) follow the same call shape:
 *   <module>.login(); navigate_to_transactions(); main_loop('<profile>')
 * The filename (TXN vs NAME) tells ops which anchor fields the portal flow expects.
 */

export type ThinScriptKind = 'txn' | 'name' | 'unknown';

export function inferThinScriptKind(relativePath: string): ThinScriptKind {
  const base = relativePath.trim().split(/[/\\]/).pop() ?? '';
  const u = base.toUpperCase();
  if (u.includes('_NAME_') || /^TP_.*_NAME_/i.test(base)) return 'name';
  if (u.startsWith('TP_') && u.includes('_TXN_')) return 'txn';
  return 'unknown';
}

/** Maps recognized thin script names to operator form mode. */
export function anchorModeForThinScript(
  relativePath: string,
): 'txn' | 'name' | null {
  const k = inferThinScriptKind(relativePath);
  if (k === 'txn') return 'txn';
  if (k === 'name') return 'name';
  return null;
}
