/** Join configured display fields, falling back to the id when they are blank. */
export function displayLabel(row: Record<string, unknown>, fields: string[], fallback: unknown): string {
  const parts = fields.map((field) => row[field]).filter((value) => value != null && String(value).trim() !== '')
  if (parts.length) return parts.map(String).join(' ')
  return fallback == null || fallback === '' ? '' : String(fallback)
}
