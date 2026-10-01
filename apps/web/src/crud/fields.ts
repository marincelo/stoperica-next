import type { FieldMeta, ModelMeta } from '@stoperica/shared'

export type InputKind =
  | 'text'
  | 'textarea'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'datetime'
  | 'enum'
  | 'relation'
  | 'json'

const LONG_TEXT_NATIVE_TYPES = new Set([null, 'Text'])

export function isLongText(field: FieldMeta): boolean {
  return field.type === 'String' && LONG_TEXT_NATIVE_TYPES.has(field.nativeType)
}

export function inputKind(field: FieldMeta): InputKind {
  if (field.foreignKeyFor?.resource) return 'relation'
  if (field.kind === 'enum' || field.intEnum) return 'enum'
  if (field.isList || field.type === 'Json') return 'json'
  switch (field.type) {
    case 'Int':
    case 'BigInt':
      return 'integer'
    case 'Float':
    case 'Decimal':
      return 'number'
    case 'Boolean':
      return 'boolean'
    case 'DateTime':
      return 'datetime'
    default:
      return isLongText(field) ? 'textarea' : 'text'
  }
}

/** Scalar/enum fields shown on detail pages, in schema order. */
export function valueFields(meta: ModelMeta): FieldMeta[] {
  return meta.fields.filter((f) => f.kind !== 'object')
}

export function formFields(meta: ModelMeta): FieldMeta[] {
  return valueFields(meta).filter((f) => !f.isReadOnly)
}

/** Fields that make sense as table columns. */
export function columnCandidates(meta: ModelMeta): FieldMeta[] {
  return valueFields(meta).filter((f) => !f.isList && f.type !== 'Json' && !isLongText(f))
}

export function defaultColumns(meta: ModelMeta, max = 8): string[] {
  const candidates = columnCandidates(meta).map((f) => f.name)
  const preferred = [meta.idField, ...displayFieldsOf(meta)]
  const rest = candidates.filter((name) => !preferred.includes(name) && name !== 'updatedAt')
  return [...new Set([...preferred, ...rest])].filter((n) => candidates.includes(n)).slice(0, max)
}

export function displayFieldsOf(meta: ModelMeta): string[] {
  return meta.displayFields?.length ? meta.displayFields : [meta.displayField]
}

export function displayLabel(row: Record<string, unknown>, fields: string[], fallback: unknown): string {
  const parts = fields.map((field) => row[field]).filter((value) => value != null && String(value).trim() !== '')
  if (parts.length) return parts.map(String).join(' ')
  return fallback == null || fallback === '' ? '—' : String(fallback)
}

export function isRequiredInput(field: FieldMeta): boolean {
  return field.isRequired && !field.hasDefault && !field.isList && field.type !== 'Boolean'
}

/** API value -> form model value. */
export function toFormValue(field: FieldMeta, value: unknown): unknown {
  switch (inputKind(field)) {
    case 'datetime':
      return value ? Date.parse(value as string) : null
    case 'json':
      return value === null || value === undefined ? '' : JSON.stringify(value, null, 2)
    default:
      return value ?? null
  }
}

/** Form model value -> API value. Throws with a user-facing message on invalid JSON. */
export function fromFormValue(field: FieldMeta, value: unknown): unknown {
  switch (inputKind(field)) {
    case 'datetime':
      return typeof value === 'number' ? new Date(value).toISOString() : null
    case 'json': {
      const text = String(value ?? '').trim()
      if (!text) return field.isList ? [] : null
      try {
        return JSON.parse(text)
      } catch {
        throw new Error('Neispravan JSON')
      }
    }
    case 'text':
    case 'textarea':
      return value === '' && !field.isRequired ? null : value
    default:
      return value ?? null
  }
}

export function emptyFormValue(field: FieldMeta): unknown {
  if (field.type === 'Boolean' && field.isRequired) return false
  return inputKind(field) === 'json' ? (field.isList ? '[]' : '') : null
}
