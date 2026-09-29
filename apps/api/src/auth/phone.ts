/**
 * Normalizes Croatian phone numbers to the national significant number so that
 * "+385 91 234 5678", "00385912345678", "0912345678" and "385912345678" all match.
 */
export function normalizePhone(value: string | null | undefined): string {
  let digits = (value ?? '').replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('385')) digits = digits.slice(3)
  return digits.replace(/^0+/, '')
}

export function phonesMatch(stored: string | null | undefined, provided: string): boolean {
  const a = normalizePhone(stored)
  return a.length >= 6 && a === normalizePhone(provided)
}
