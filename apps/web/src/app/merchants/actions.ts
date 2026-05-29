'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getBearerHeaders } from '@/lib/auth-cookies';
import { getOpsApiBaseUrl } from '@/lib/ops-api';

export type MerchantFormResult =
  | { ok: true }
  | { ok: false; message: string };

const HARDCODED_COMPANY  = 'c32c90c4-aca9-4dd5-9657-f60a190131ab';
const HARDCODED_MERCHANT = 'pp1';
const DEFAULT_API        = 'https://staging-api.ultrapay.live/v1/bankResponse/create-bot-message-bulk';

export async function createMerchant(
  _prev: MerchantFormResult | null,
  formData: FormData,
): Promise<MerchantFormResult> {
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

  const isPaytmLogin = loginType === 'paytm_login';
  if (!profileKey || (!isPaytmLogin && (!mobileNumber || !password)) || !bankId || !lastUtrChatId) {
    return { ok: false, message: 'Profile key, Bank ID, and UTR chat ID are required.' };
  }

  const payload = {
    profileKey,
    mobileNumber: isPaytmLogin ? 'paytm_user' : mobileNumber,
    password: isPaytmLogin ? 'paytm_pass' : password,
    bankId,
    api: apiUrl,
    company: HARDCODED_COMPANY,
    lastUtrChatId,
    merchant: HARDCODED_MERCHANT,
    txnPass: txnPass || 'none',
    portalListingMid: portalListingMid || undefined,
    executableRelativePath: executableRelativePath || undefined,
  };

  try {
    const base = getOpsApiBaseUrl();
    const res = await fetch(`${base}/paytm-merchants/admin`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, message: `${res.status}: ${text}` };
    }
    revalidatePath('/merchants');
    revalidatePath('/merchant-run');
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

export async function updateMerchant(
  merchantId: string,
  _prev: MerchantFormResult | null,
  formData: FormData,
): Promise<MerchantFormResult> {
  const auth = await getBearerHeaders();
  if (!auth) redirect('/access');

  const profileKey    = String(formData.get('profileKey') ?? '').trim();
  const loginType     = String(formData.get('loginType') ?? '').trim();
  const mobileNumber  = String(formData.get('mobileNumber') ?? '').trim();
  const password      = String(formData.get('password') ?? '');
  const bankId        = String(formData.get('bankId') ?? '').trim();
  const lastUtrChatId = String(formData.get('lastUtrChatId') ?? '').trim();
  const apiUrl        = String(formData.get('api') ?? '').trim() || DEFAULT_API;

  const isPaytmLogin = loginType === 'paytm_login';
  if (!profileKey || (!isPaytmLogin && !mobileNumber) || !bankId || !lastUtrChatId) {
    return { ok: false, message: 'Account name, credential, Bank ID, and Telegram chat ID are required.' };
  }

  const payload: Record<string, string> = {
    profileKey,
    mobileNumber: isPaytmLogin ? 'paytm_user' : mobileNumber,
    bankId,
    api: apiUrl,
    company: HARDCODED_COMPANY,
    lastUtrChatId,
    merchant: HARDCODED_MERCHANT,
  };
  if (isPaytmLogin) {
    payload.password = 'paytm_pass';
  } else if (password.length > 0) {
    payload.password = password;
  }

  try {
    const base = getOpsApiBaseUrl();
    const res = await fetch(`${base}/paytm-merchants/admin/${merchantId}`, {
      method: 'PATCH',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, message: `${res.status}: ${text}` };
    }
    revalidatePath('/merchants');
    revalidatePath(`/merchants/${merchantId}`);
    revalidatePath('/merchant-run');
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

export async function deleteMerchant(merchantId: string): Promise<MerchantFormResult> {
  const auth = await getBearerHeaders();
  if (!auth) redirect('/access');

  try {
    const base = getOpsApiBaseUrl();
    const res = await fetch(`${base}/paytm-merchants/admin/${merchantId}`, {
      method: 'DELETE',
      headers: auth,
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, message: `${res.status}: ${text}` };
    }
    revalidatePath('/merchants');
    revalidatePath('/merchant-run');
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}
