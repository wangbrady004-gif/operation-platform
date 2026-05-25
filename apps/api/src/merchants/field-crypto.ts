import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/** AES-256-GCM payloads: base64(iv(12) + tag(16) + ciphertext). */
export function encryptField(plaintext: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptField(blob: string, secret: string): string {
  const buf = Buffer.from(blob, 'base64');
  if (buf.length < 28) {
    throw new Error('invalid ciphertext length');
  }
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const key = deriveKey(secret);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    'utf8',
  );
}

function deriveKey(secret: string): Buffer {
  if (secret.length < 16) {
    throw new Error('MERCHANT_ENCRYPTION_KEY must be at least 16 characters');
  }
  return scryptSync(secret, 'ops-paytm-merchant-v1', 32);
}
