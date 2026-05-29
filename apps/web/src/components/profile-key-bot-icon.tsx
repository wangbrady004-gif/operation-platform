'use client';

import { useState } from 'react';
import { Globe, Store } from 'lucide-react';
import { domainForProfileKey } from '@/lib/profile-key-domain';

type Props = {
  profileKey: string;
  /** Tailwind class for icon when using fallback (Globe/Store), e.g. h-3.5 w-3.5 */
  className?: string;
  faviconClassName?: string;
};

/**
 * Favicon for a bank profile — same logic as the bank registry (prefix → bank domain).
 */
export function ProfileKeyBotIcon({
  profileKey,
  className = 'h-3.5 w-3.5 text-zinc-400',
  faviconClassName = 'rounded-sm object-contain',
}: Props) {
  const domain = domainForProfileKey(profileKey);
  const [failed, setFailed] = useState(false);
  if (!domain || failed) {
    const u = profileKey.toUpperCase();
    if (u.includes('GOOGLE')) return <Globe className={`text-sky-400 ${className}`} aria-hidden />;
    return <Store className={className} aria-hidden />;
  }
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
      alt=""
      width={16}
      height={16}
      onError={() => setFailed(true)}
      className={faviconClassName}
    />
  );
}
