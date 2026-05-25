import { NextResponse } from 'next/server';
import { getBearerHeaders } from '@/lib/auth-cookies';
import { getOpsApiBaseUrl } from '@/lib/ops-api';

/**
 * Proxies authenticated roster for the Team page so requests show in DevTools (browser → Next → Nest).
 */
export async function GET() {
  const auth = await getBearerHeaders();
  if (!auth) {
    return NextResponse.json({ message: 'Not signed in' }, { status: 401 });
  }

  const base = getOpsApiBaseUrl();
  let res: Response;
  try {
    res = await fetch(`${base}/auth/users`, {
      headers: auth,
      cache: 'no-store',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        message: `Cannot reach Ops API at ${base}. Start the Nest app (npm run api) or set OPS_API_URL.`,
        detail: msg,
      },
      { status: 502 },
    );
  }

  const raw = await res.text();
  if (!res.ok) {
    try {
      const j = JSON.parse(raw) as { message?: unknown };
      const m = j.message;
      const message =
        Array.isArray(m) ? m.join(' · ') : typeof m === 'string' ? m : raw.slice(0, 300);
      return NextResponse.json({ message }, { status: res.status });
    } catch {
      return NextResponse.json(
        {
          message: `${res.status} from Ops API`,
          detail: raw.slice(0, 300),
        },
        { status: res.status >= 400 ? res.status : 502 },
      );
    }
  }

  try {
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { message: 'Ops API returned invalid JSON for /auth/users' },
      { status: 502 },
    );
  }
}
