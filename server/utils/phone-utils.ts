
import { parsePhoneNumberFromString } from 'libphonenumber-js'

export function normalizePhoneNumber(raw: string): string | null {
  const parsed = parsePhoneNumberFromString(raw)
  if (!parsed || !parsed.isValid()) return null
  return parsed.number // formato E.164: ej. +593999999999
}
