/**
 * Maps profile_key prefixes / patterns to a domain for favicon resolution.
 * There is no separate bank_type column — bank family is inferred from profile_key (as in registry).
 */
const DOMAIN_BY_PREFIX: [string, string][] = [
  ['GOOGLE', 'pay.google.com'],
  ['TP_PHONEPE', 'phonepe.com'],
  ['PHONEPE', 'phonepe.com'],
  ['TP_IOB', 'iob.in'],
  ['IOB', 'iob.in'],
  ['TP_IDBI', 'idbi.com'],
  ['IDBI', 'idbi.com'],
  ['TP_IND', 'indusind.com'],
  ['IND', 'indusind.com'],
  ['TP_TMB', 'tmb.in'],
  ['TMB', 'tmb.in'],
  ['TP_UCO', 'ucobank.com'],
  ['UCO', 'ucobank.com'],
];

/** Public domain for Google favicon service, or null for generic icon fallback. */
export function domainForProfileKey(profileKey: string): string | null {
  const u = profileKey.toUpperCase();
  if (u.includes('GOOGLE')) return 'pay.google.com';
  for (const [prefix, domain] of DOMAIN_BY_PREFIX) {
    if (u.startsWith(prefix)) return domain;
  }
  return null;
}
