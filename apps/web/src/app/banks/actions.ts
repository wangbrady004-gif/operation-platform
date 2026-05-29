'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getBearerHeaders } from '@/lib/auth-cookies';
import { getOpsApiBaseUrl } from '@/lib/ops-api';

export type BankFormResult =
  | { ok: true }
  | { ok: false; message: string };

const HARDCODED_COMPANY  = 'c32c90c4-aca9-4dd5-9657-f60a190131ab';
const HARDCODED_PARTNER_CODE = 'pp1';
const DEFAULT_API        = 'https://staging-api.ultrapay.live/v1/bankResponse/create-bot-message-bulk';

export async function createBank(
  _prev: BankFormResult | null,
  formData: FormData,
): Promise<BankFormResult> {
  const auth = await getBearerHeaders();
  if (!auth) redirect('/access');

  const profileKey            = String(formData.get('profileKey') ?? '').trim();
  const loginType             = String(formData.get('loginType') ?? '').trim();
  const mobileNumber          = String(formData.get('mobileNumber') ?? '').trim();
  const password              = String(formData.get('password') ?? '');
  const bankId                = String(formData.get('bankId') ?? '').trim();
  const lastUtrChatId         = String(formData.get('lastUtrChatId') ?? '').trim();
  const apiUrl                = String(formData.get('api') ?? '').trim() || DEFAULT_API;
  const txnPass               = String(formData.get('txnPass') ?? '');
  const portalListingMid      = String(formData.get('portalListingMid') ?? '').trim();
  const executableRelativePath = String(formData.get('executableRelativePath') ?? '').trim();

  const isWalletAppLogin = loginType === 'paytm_login';
  if (!profileKey || (!isWalletAppLogin && (!mobileNumber || !password)) || !bankId || !lastUtrChatId) {
    return { ok: false, message: 'Profile key, Bank ID, and UTR chat ID are required.' };
  }

  const payload = {
    profileKey,
    mobileNumber: isWalletAppLogin ? 'paytm_user' : mobileNumber,
    password: isWalletAppLogin ? 'paytm_pass' : password,
    bankId,
    api: apiUrl,
    company: HARDCODED_COMPANY,
    lastUtrChatId,
    merchant: HARDCODED_PARTNER_CODE,
    txnPass: txnPass || 'none',
    portalListingMid: portalListingMid || undefined,
    executableRelativePath: executableRelativePath || undefined,
  };

  try {
    const base = getOpsApiBaseUrl();
    const res = await fetch(`${base}/banks/admin`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, message: `${res.status}: ${text}` };
    }
    revalidatePath('/banks');
    revalidatePath('/bank-run');
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

export async function updateBank(
  bankProfileId: string,
  _prev: BankFormResult | null,
  formData: FormData,
): Promise<BankFormResult> {
  const auth = await getBearerHeaders();
  if (!auth) redirect('/access');

  const profileKey    = String(formData.get('profileKey') ?? '').trim();
  const loginType     = String(formData.get('loginType') ?? '').trim();
  const mobileNumber  = String(formData.get('mobileNumber') ?? '').trim();
  const password      = String(formData.get('password') ?? '');
  const bankId        = String(formData.get('bankId') ?? '').trim();
  const lastUtrChatId = String(formData.get('lastUtrChatId') ?? '').trim();
  const apiUrl        = String(formData.get('api') ?? '').trim() || DEFAULT_API;

  const isWalletAppLogin = loginType === 'paytm_login';
  if (!profileKey || (!isWalletAppLogin && !mobileNumber) || !bankId || !lastUtrChatId) {
    return { ok: false, message: 'Account name, credential, Bank ID, and Telegram chat ID are required.' };
  }

  const payload: Record<string, string> = {
    profileKey,
    mobileNumber: isWalletAppLogin ? 'paytm_user' : mobileNumber,
    bankId,
    api: apiUrl,
    company: HARDCODED_COMPANY,
    lastUtrChatId,
    merchant: HARDCODED_PARTNER_CODE,
  };
  if (isWalletAppLogin) {
    payload.password = 'paytm_pass';
  } else if (password.length > 0) {
    payload.password = password;
  }

  try {
    const base = getOpsApiBaseUrl();
    const res = await fetch(`${base}/banks/admin/${bankProfileId}`, {
      method: 'PATCH',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, message: `${res.status}: ${text}` };
    }
    revalidatePath('/banks');
    revalidatePath(`/banks/${bankProfileId}`);
    revalidatePath('/bank-run');
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

export async function deleteBank(bankProfileId: string): Promise<BankFormResult> {
  const auth = await getBearerHeaders();
  if (!auth) redirect('/access');

  try {
    const base = getOpsApiBaseUrl();
    const res = await fetch(`${base}/banks/admin/${bankProfileId}`, {
      method: 'DELETE',
      headers: auth,
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, message: `${res.status}: ${text}` };
    }
    revalidatePath('/banks');
    revalidatePath('/bank-run');
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}
