export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getBearerHeaders } from '@/lib/auth-cookies';
import { getOpsApiBaseUrl } from '@/lib/ops-api';

/**
 * SSE proxy — streams NestJS /events to the browser.
 *
 * The browser's EventSource can't set custom headers, so we proxy through
 * here where we can attach the auth cookie as a Bearer token.
 *
 * req.signal is passed to the upstream fetch so the NestJS connection is
 * cleanly aborted when the browser tab closes.
 */
export async function GET(req: Request) {
  const auth = await getBearerHeaders();
  if (!auth) {
    return new Response('Unauthorized', { status: 401 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${getOpsApiBaseUrl()}/events`, {
      headers: {
        ...auth,
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      signal: req.signal,
    });
  } catch {
    return new Response('Event stream unavailable', { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response('Event stream unavailable', { status: upstream.status });
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no', // tells Nginx not to buffer SSE
      Connection: 'keep-alive',
    },
  });
}
