import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MS = 10 * 60 * 1000;

export function generateOtpCode(length: number = OTP_LENGTH): string {
  const max = 10 ** length;
  const code = crypto.randomInt(0, max);
  return code.toString().padStart(length, '0');
}

export async function hashOtpCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

export async function verifyOtpCode(
  code: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

export function getOtpExpiryDate(
  ttlMs: number = OTP_EXPIRY_MS,
): Date {
  return new Date(Date.now() + ttlMs);
}
