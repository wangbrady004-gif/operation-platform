import { NextRequest, NextResponse } from 'next/server';
import { getBearerHeaders } from '@/lib/auth-cookies';
import {
  EXE_BUILD_COMPANY,
  EXE_BUILD_PARTNER_CODE,
  inferBankExeBuildConfig,
  resolveBankExeApi,
} from '@/lib/bank-exe-build';
import { getOpsApiBaseUrl } from '@/lib/ops-api';

const BUILD_SERVER_URL =
  (process.env.BUILD_SERVER_URL as string | undefined) ?? 'http://localhost:7127';
const BUILD_API_KEY =
  (process.env.BUILD_API_KEY as string | undefined) ?? '';

function genAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const raw = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
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
  const detailRes = await fetch(`${base}/banks/admin/${id}`, {
    headers: auth,
    cache: 'no-store',
  });
  if (!detailRes.ok) {
    const msg = detailRes.status === 404 ? 'Bank profile not found' : `Ops API error: ${detailRes.status}`;
    return NextResponse.json({ error: msg }, { status: detailRes.status });
  }
  const detail = await detailRes.json() as {
    profileKey: string;
    mobileNumber: string;
    password: string;
    bankId: string;
    lastUtrChatId: string;
    api?: string;
    company?: string;
    merchant?: string;
  };

  const cfg = inferBankExeBuildConfig(detail.profileKey);
  if (!cfg) {
    return NextResponse.json(
      { error: 'Generate EXE is only supported for UPI wallet profiles.' },
      { status: 422 },
    );
  }

  const accessCode = genAccessCode();

  const values: Record<string, string> = {
    bank_id: detail.bankId,
    api: resolveBankExeApi(detail.api),
    company: detail.company?.trim() || EXE_BUILD_COMPANY,
    merchant: detail.merchant?.trim() || EXE_BUILD_PARTNER_CODE,
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
      source: 'ops',
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
