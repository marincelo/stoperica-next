import type { FieldMeta } from '@stoperica/shared'
import type { Resource } from './registry.js'

type JsonSchema = Record<string, unknown>

export function writableFields(resource: Resource): FieldMeta[] {
  return resource.meta.fields.filter((f) => f.kind !== 'object' && !f.isReadOnly)
}

function scalarSchema(field: FieldMeta, enums: Record<string, string[]>): JsonSchema {
  if (field.intEnum) return { type: 'integer', minimum: 0, maximum: field.intEnum.length - 1 }
  if (field.kind === 'enum') return { type: 'string', enum: enums[field.type] ?? [] }
  switch (field.type) {
    case 'String':
      return { type: 'string' }
    case 'Int':
      return { type: 'integer', minimum: -2147483648, maximum: 2147483647 }
    case 'BigInt':
      return { anyOf: [{ type: 'integer' }, { type: 'string', pattern: '^-?\\d+$' }] }
    case 'Float':
      return { type: 'number' }
    case 'Decimal':
      return { anyOf: [{ type: 'number' }, { type: 'string', pattern: '^-?\\d+(\\.\\d+)?$' }] }
    case 'Boolean':
      return { type: 'boolean' }
    case 'DateTime':
      return { type: 'string', format: 'date-time' }
    case 'Json':
      return {}
    default:
      return { type: 'string' }
  }
}

function fieldSchema(field: FieldMeta, enums: Record<string, string[]>): JsonSchema {
  const base = scalarSchema(field, enums)
  const schema = field.isList ? { type: 'array', items: base } : base
  if (field.isRequired || field.isList || field.type === 'Json') return schema
  // Null must match before any coercing branch, otherwise Ajv's coerceTypes turns null into 0/"".
  if (typeof schema.type === 'string') return { ...schema, type: [schema.type, 'null'] }
  return { anyOf: [{ type: 'null' }, schema] }
}

export function bodySchema(resource: Resource, mode: 'create' | 'update'): JsonSchema {
  const fields = writableFields(resource)
  const properties = Object.fromEntries(fields.map((f) => [f.name, fieldSchema(f, resource.meta.enums)]))
  const required =
    mode === 'create'
      ? fields.filter((f) => f.isRequired && !f.hasDefault && !f.isList).map((f) => f.name)
      : []
  return {
    type: 'object',
    // Unknown, hidden and read-only fields are stripped by Fastify's `removeAdditional`.
    additionalProperties: false,
    properties,
    ...(required.length ? { required } : {}),
  }
}

export const listQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    sort: { type: 'string' },
    order: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
    search: { type: 'string', maxLength: 200 },
  },
} as const

export const optionsQuerySchema = {
  type: 'object',
  properties: {
    search: { type: 'string', maxLength: 200 },
    ids: { type: 'string', maxLength: 2000 },
  },
} as const
