import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js/min';

export function validatePhoneNumber(phone: string): boolean {
  if (!phone) return false;
  if (!phone.startsWith('+')) return false;

  try {
    return isValidPhoneNumber(phone);
  } catch (e) {
    return false;
  }
}

export function normalizePhoneNumber(phone: string, country = 'EC'): string | null {
  try {
    const parsed = parsePhoneNumber(phone, country);
    if (!parsed) return null;
    return parsed.format('E.164'); // Returns in format +593999999999
  } catch (e) {
    return null;
  }
}