import type { FieldMeta } from '@stoperica/shared'
import { Prisma } from '../generated/prisma/client.js'
import { HttpError } from '../lib/errors.js'
import type { Resource } from './registry.js'
import { writableFields } from './schema.js'

/** Parse a route `:id` param according to the model's id field type. */
export function parseId(resource: Resource, raw: string): string | number | bigint {
  const idField = resource.meta.fields.find((f) => f.name === resource.meta.idField)!
  return parseKey(idField, raw)
}

export function parseKey(field: FieldMeta, raw: string): string | number | bigint {
  if (field.type === 'Int') {
    if (!/^-?\d+$/.test(raw)) throw new HttpError(400, `Neispravan ID "${raw}"`)
    return Number(raw)
  }
  if (field.type === 'BigInt') {
    if (!/^-?\d+$/.test(raw)) throw new HttpError(400, `Neispravan ID "${raw}"`)
    return BigInt(raw)
  }
  return raw
}

/** Convert a validated request body into Prisma `data`. */
export function toPrismaData(
  resource: Resource,
  body: Record<string, unknown>,
  mode: 'create' | 'update',
): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  for (const field of writableFields(resource)) {
    if (!(field.name in body)) continue
    data[field.name] = convertValue(field, body[field.name])
  }
  if (mode === 'create') {
    const createdAt = resource.model.fields.find((f) => f.name === 'createdAt' && f.type === 'DateTime')
    if (createdAt && !createdAt.hasDefaultValue) data.createdAt = new Date()
  }
  return data
}

function convertValue(field: FieldMeta, value: unknown): unknown {
  if (field.type === 'Json') {
    if (field.isList) return value ?? []
    return value === null ? (field.isRequired ? Prisma.JsonNull : Prisma.DbNull) : value
  }
  if (value === null || value === undefined) return value
  if (field.isList && Array.isArray(value)) return value.map((v) => convertScalar(field, v))
  return convertScalar(field, value)
}

function convertScalar(field: FieldMeta, value: unknown): unknown {
  switch (field.type) {
    case 'BigInt':
      return BigInt(value as string | number)
    case 'DateTime':
      return new Date(value as string)
    case 'Decimal':
      return new Prisma.Decimal(value as string | number)
    default:
      return value
  }
}
