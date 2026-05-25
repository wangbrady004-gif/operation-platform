import { NextResponse } from 'next/server';
import { getBearerHeaders } from '@/lib/auth-cookies';
import { getOpsApiBaseUrl } from '@/lib/ops-api';

const BUILD_SERVER_URL =
  (process.env.NEXT_PUBLIC_BUILD_SERVER_URL as string | undefined) ?? 'http://localhost:7127';
const BUILD_API_KEY =
  (process.env.NEXT_PUBLIC_BUILD_API_KEY as string | undefined) ?? '';
const OPS_API_URL =
  (process.env.OPS_API_URL as string | undefined) ?? 'http://127.0.0.1:8899';
const LAUNCHER_KEY =
  (process.env.LAUNCHER_KEY as string | undefined) ?? '';

export async function GET() {
  const auth = await getBearerHeaders();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const res = await fetch(`${getOpsApiBaseUrl()}/ops-launchers`, { headers: auth, cache: 'no-store' });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function POST(req: Request) {
  const auth = await getBearerHeaders();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { launcherId, botRoot } = await req.json() as { launcherId: string; botRoot?: string };
  if (!launcherId?.trim()) {
    return NextResponse.json({ error: 'launcherId is required' }, { status: 400 });
  }
  if (!LAUNCHER_KEY) {
    return NextResponse.json(
      { error: 'LAUNCHER_KEY is not configured on the server — set it in .env' },
      { status: 500 },
    );
  }

  // Check DB — block if already exists and not marked for update
  const checkRes = await fetch(`${getOpsApiBaseUrl()}/ops-launchers`, {
    headers: auth,
    cache: 'no-store',
  });
  if (checkRes.ok) {
    const launchers = await checkRes.json() as { launcherId: string; needsUpdate: boolean }[];
    const existing = launchers.find((l) => l.launcherId === launcherId.trim());
    if (existing && !existing.needsUpdate) {
      return NextResponse.json(
        { error: `Launcher "${launcherId.trim()}" already exists. Ask an admin to mark it for update first.` },
        { status: 409 },
      );
    }
  }

  // Build the EXE
  const buildRes = await fetch(`${BUILD_SERVER_URL}/api/generate-ops-launcher`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(BUILD_API_KEY && { 'X-Build-Api-Key': BUILD_API_KEY }),
    },
    body: JSON.stringify({
      launcherId:  launcherId.trim(),
      launcherKey: LAUNCHER_KEY,
      opsApiUrl:   OPS_API_URL,
      ...(botRoot?.trim() && { botRoot: botRoot.trim() }),
    }),
  }).catch(() => null);

  if (!buildRes || !buildRes.ok) {
    const err = await buildRes?.json().catch(() => ({})) as { error?: string };
    return NextResponse.json(
      { error: err.error ?? 'Build server offline or unreachable.' },
      { status: 502 },
    );
  }

  // Record in DB
  await fetch(`${getOpsApiBaseUrl()}/ops-launchers/record`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ launcherId: launcherId.trim(), botRoot: botRoot?.trim() ?? null }),
    cache: 'no-store',
  });

  const blob = await buildRes.arrayBuffer();
  const filename = `OpsLauncher_${launcherId.trim()}.exe`;

  return new NextResponse(blob, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
