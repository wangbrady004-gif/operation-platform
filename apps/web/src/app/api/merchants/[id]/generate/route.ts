import { NextRequest, NextResponse } from 'next/server';
import { getBearerHeaders } from '@/lib/auth-cookies';
import { getOpsApiBaseUrl } from '@/lib/ops-api';

const BUILD_SERVER_URL =
  (process.env.NEXT_PUBLIC_BUILD_SERVER_URL as string | undefined) ?? 'http://localhost:7127';
const BUILD_API_KEY =
  (process.env.NEXT_PUBLIC_BUILD_API_KEY as string | undefined) ?? '';

const HARDCODED_API      = 'https://api.ultrapay.live/v1/bankResponse/create-bot-message-bulk';
const HARDCODED_COMPANY  = 'c32c90c4-aca9-4dd5-9657-f60a190131ab';
const HARDCODED_MERCHANT = 'pp1';

function genAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const raw = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

function inferBuildConfig(profileKey: string): {
  module: string;
  settingsKey: string;
  loginType: 'gmail_pass' | 'paytm_login';
} | null {
  const u = profileKey.toUpperCase();
  if (u.includes('GOOGLE')) {
    return { module: 'tp_127_google_main', settingsKey: 'GOOGLE', loginType: 'gmail_pass' };
  }
  if (u.startsWith('TP_PAYTM') || u.startsWith('PAYTM')) {
    return { module: 'tp_127_paytm_main', settingsKey: 'PAYTM', loginType: 'paytm_login' };
  }
  return null;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const auth = await getBearerHeaders();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch merchant credentials from ops API
  const base = getOpsApiBaseUrl();
  const detailRes = await fetch(`${base}/paytm-merchants/admin/${id}`, {
    headers: auth,
    cache: 'no-store',
  });
  if (!detailRes.ok) {
    const msg = detailRes.status === 404 ? 'Merchant not found' : `Ops API error: ${detailRes.status}`;
    return NextResponse.json({ error: msg }, { status: detailRes.status });
  }
  const detail = await detailRes.json() as {
    profileKey: string;
    mobileNumber: string;
    password: string;
    bankId: string;
    lastUtrChatId: string;
  };

  const cfg = inferBuildConfig(detail.profileKey);
  if (!cfg) {
    return NextResponse.json(
      { error: 'Generate EXE is only supported for Google Pay and Paytm profiles.' },
      { status: 422 },
    );
  }

  const accessCode = genAccessCode();

  const values: Record<string, string> = {
    bank_id: detail.bankId,
    api: HARDCODED_API,
    company: HARDCODED_COMPANY,
    merchant: HARDCODED_MERCHANT,
    last_utr_chat_id: detail.lastUtrChatId,
  };

  if (cfg.loginType === 'gmail_pass') {
    values.gmail_id = detail.mobileNumber;
    values.password = detail.password;
  } else {
    values.mobile_number = detail.mobileNumber;
    values.password = detail.password;
  }

  const buildRes = await fetch(`${BUILD_SERVER_URL}/api/generate-exe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(BUILD_API_KEY && { 'X-Build-Api-Key': BUILD_API_KEY }),
    },
    body: JSON.stringify({
      accountKey: detail.profileKey,
      module: cfg.module,
      settingsKey: cfg.settingsKey,
      loginType: cfg.loginType,
      hasInitial: false,
      navWithKey: false,
      accessCode,
      values,
    }),
  }).catch((e) => {
    throw new Error(`Build server unreachable: ${e instanceof Error ? e.message : String(e)}`);
  });

  if (!buildRes.ok) {
    const err = await buildRes.json().catch(() => ({ error: buildRes.statusText })) as { error?: string };
    return NextResponse.json({ error: err.error ?? 'Build failed' }, { status: 502 });
  }

  const blob = await buildRes.arrayBuffer();
  const fileName = `${detail.profileKey}.exe`;

  return new NextResponse(blob, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'X-Access-Code': accessCode,
      'X-File-Name': fileName,
    },
  });
}
