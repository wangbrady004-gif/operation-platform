/** Staging vs production bot-message API (matches bank profile edit form). */
export const BANK_API_STAGING =
  'https://staging-api.ultrapay.live/v1/bankResponse/create-bot-message-bulk';
export const BANK_API_PRODUCTION =
  'https://api.ultrapay.live/v1/bankResponse/create-bot-message-bulk';

export const EXE_BUILD_COMPANY = 'c32c90c4-aca9-4dd5-9657-f60a190131ab';
export const EXE_BUILD_PARTNER_CODE = 'pp1';

export type BankExeBuildConfig = {
  module: string;
  settingsKey: string;
  loginType: 'gmail_pass' | 'paytm_login';
};

export function inferBankExeBuildConfig(profileKey: string): BankExeBuildConfig | null {
  const u = profileKey.toUpperCase();
  if (u.includes('GOOGLE')) {
    return { module: 'tp_127_google_main', settingsKey: 'GOOGLE', loginType: 'gmail_pass' };
  }
  if (u.startsWith('TP_PAYTM') || u.startsWith('PAYTM')) {
    return { module: 'tp_127_paytm_main', settingsKey: 'PAYTM', loginType: 'paytm_login' };
  }
  return null;
}

export function bankExeLoginLabel(loginType: BankExeBuildConfig['loginType']): string {
  return loginType === 'gmail_pass' ? 'Gmail ID' : 'Mobile Number';
}

/** Uses the bank profile’s saved API URL, defaulting to staging. */
export function resolveBankExeApi(stored?: string | null): string {
  const trimmed = stored?.trim();
  if (trimmed) return trimmed;
  return BANK_API_STAGING;
}

export function bankApiEnvironmentLabel(api: string): 'Staging' | 'Production' | 'Custom' {
  if (api === BANK_API_STAGING) return 'Staging';
  if (api === BANK_API_PRODUCTION) return 'Production';
  return 'Custom';
}
