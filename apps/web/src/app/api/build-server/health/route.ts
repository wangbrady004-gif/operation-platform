export const dynamic = 'force-dynamic';

const BUILD_SERVER_URL =
  (process.env.BUILD_SERVER_URL as string | undefined) ?? 'http://localhost:7127';

/**
 * Proxies the build server's public /api/health endpoint.
 * /api/health is unauthenticated on the build server — no API key needed.
 *
 * Returns:
 *   { online: true,  platform, isWindows, hasInstaller }
 *   { online: false, error }
 */
export async function GET() {
  try {
    const res = await fetch(`${BUILD_SERVER_URL}/api/health`, {
      signal: AbortSignal.timeout(5_000),
      cache: 'no-store',
    });

    if (!res.ok) {
      return Response.json({ online: false, error: `HTTP ${res.status}` });
    }

    const data = (await res.json()) as {
      status: string;
      platform: string;
      platformLabel: string;
      ext: string;
      pyinstaller: string;
      bot_root: string;
    };

    return Response.json({
      online: true,
      platform: data.platformLabel,
      isWindows: data.platform === 'win32',
      hasInstaller: data.pyinstaller !== 'not found',
      ext: data.ext,
    });
  } catch {
    return Response.json({ online: false, error: 'Build server unreachable' });
  }
}
