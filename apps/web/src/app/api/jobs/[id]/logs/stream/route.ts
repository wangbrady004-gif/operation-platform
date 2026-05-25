import http from 'node:http';
import https from 'node:https';
import type { IncomingMessage } from 'node:http';
import { Readable } from 'node:stream';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { AUTH_COOKIE } from '@/lib/auth-cookies';
import { getOpsApiBaseUrl } from '@/lib/ops-api';

export const dynamic = 'force-dynamic';

/**
 * Proxies SSE from Nest. Uses `node:http[s].request`, not global `fetch()`: Undici closes
 * the upstream body after its default bodies timeout (~300s), which breaks idle streams.
 */
function connectSseUpstream(
  upstreamUrl: string,
  outboundHeaders: Record<string, string>,
): Promise<
  | { ok: true; stream: ReadableStream }
  | { ok: false; status: number; text: string }
> {
  return new Promise((resolve, reject) => {
    const u = new URL(upstreamUrl);
    const transport = u.protocol === 'https:' ? https : http;

    const req = transport.request(
      upstreamUrl,
      {
        method: 'GET',
        headers: outboundHeaders,
        timeout: 0,
      },
      (incoming: IncomingMessage) => {
        const status = incoming.statusCode ?? 502;
        const takeErrorBody = (): void => {
          const chunks: Buffer[] = [];
          incoming.on(
            'data',
            (
              chunk: string | Buffer,
            ) => {
              chunks.push(
                typeof chunk === 'string' ? Buffer.from(chunk) : chunk,
              );
            },
          );
          incoming.on('end', () => {
            resolve({
              ok: false,
              status,
              text: Buffer.concat(chunks).toString('utf8').slice(0, 8000),
            });
          });
        };

        if (status < 200 || status >= 300) {
          takeErrorBody();
          return;
        }

        try {
          // Readable.toWeb yields `stream/web` types; widen for `BodyInit`/Response typings.
          const webReadable =
            Readable.toWeb(incoming) as unknown as ReadableStream;
          resolve({ ok: true, stream: webReadable });
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      },
    );

    req.on('error', reject);
    req.setTimeout?.(0);
    req.end();
  });
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }
  const base = getOpsApiBaseUrl();

  try {
    const upstream = await connectSseUpstream(
      `${base}/jobs/${id}/logs/stream`,
      {
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
      },
    );

    if (!upstream.ok) {
      return new Response(upstream.text || 'Upstream error', {
        status: upstream.status,
      });
    }

    return new Response(upstream.stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(msg, { status: 502 });
  }
}
