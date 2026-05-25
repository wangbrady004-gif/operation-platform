import { cookies } from 'next/headers';

/** HttpOnly cookie set by `/api/auth/login`; cleared via same path/flags on logout. */
export const AUTH_COOKIE = 'ops_access_token';

export async function getBearerHeaders(): Promise<
  { Authorization: string } | null
> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}
