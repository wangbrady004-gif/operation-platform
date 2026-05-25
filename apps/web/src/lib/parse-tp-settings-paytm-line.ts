/**
 * Parse a single-line tp_settings PAYTM entry, e.g.
 * 'PAYTM_X': {'mobile_number': '...', 'password': '...', ...}
 *
 * Values must use single-quoted strings (typical tp_settings style).
 * Passwords containing a single-quote character may not parse — fix manually.
 */

export type ParsedPaytmSettingsLine = {
  profileKey: string;
  mobileNumber: string;
  password: string;
  bankId: string;
  api: string;
  company: string;
  lastUtrChatId: string;
  merchant: string;
  txnPass: string;
};

const FIELDS = [
  'mobile_number',
  'password',
  'bank_id',
  'api',
  'company',
  'last_utr_chat_id',
  'merchant',
  'txn_pass',
] as const;

function extractInnerDict(raw: string): { profileKey: string; inner: string } | null {
  const s = raw.trim().replace(/,\s*$/, '');
  const open = s.indexOf('{');
  if (open === -1) return null;
  const before = s.slice(0, open).trim();
  const pm = before.match(/^['"]([^'"]+)['"]\s*:\s*$/);
  if (!pm) return null;
  const profileKey = pm[1];

  let depth = 0;
  let start = -1;
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (c === '{') {
      if (depth === 0) start = i + 1;
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        return { profileKey, inner: s.slice(start, i) };
      }
    }
  }
  return null;
}

function pickQuoted(body: string, key: string): string {
  const re = new RegExp(`['"]${key}['"]\\s*:\\s*['"]([^'"]*)['"]`, 'i');
  const m = body.match(re);
  return (m?.[1] ?? '').trim();
}

export function parseTpSettingsPaytmLine(
  raw: string,
):
  | { ok: true; data: ParsedPaytmSettingsLine }
  | { ok: false; error: string } {
  if (!raw.trim()) {
    return { ok: false, error: 'Paste is empty.' };
  }
  const extracted = extractInnerDict(raw);
  if (!extracted) {
    return {
      ok: false,
      error:
        'Could not parse. Expected: \'PROFILE_KEY\': { ... } (single-line or trailing comma ok).',
    };
  }
  const { profileKey, inner } = extracted;
  const mobileNumber = pickQuoted(inner, 'mobile_number');
  const password = pickQuoted(inner, 'password');
  const bankId = pickQuoted(inner, 'bank_id');
  const api = pickQuoted(inner, 'api');
  const company = pickQuoted(inner, 'company');
  const lastUtrChatId = pickQuoted(inner, 'last_utr_chat_id');
  const merchant = pickQuoted(inner, 'merchant');
  const txnPass = pickQuoted(inner, 'txn_pass');

  const missing = FIELDS.filter((k) => {
    const v = pickQuoted(inner, k);
    return !v;
  });
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Missing or empty: ${missing.join(', ')}. If a password contains a single quote ('), fill the form manually.`,
    };
  }

  return {
    ok: true,
    data: {
      profileKey,
      mobileNumber,
      password,
      bankId,
      api,
      company,
      lastUtrChatId,
      merchant,
      txnPass,
    },
  };
}
