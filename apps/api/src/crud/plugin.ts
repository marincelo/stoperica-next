import type { ListQuery, ListResponse, OptionItem } from '@stoperica/shared'
import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { prisma } from '../db.js'
import { HttpError } from '../lib/errors.js'
import { ResourceRegistry, type Resource } from './registry.js'
import type { ResourceEntry } from './resource.js'
import { bodySchema, listQuerySchema, optionsQuerySchema } from './schema.js'
import { parseId, parseKey, toPrismaData } from './values.js'

interface Delegate {
  findMany(args: object): Promise<Record<string, unknown>[]>
  findUnique(args: object): Promise<Record<string, unknown> | null>
  count(args: object): Promise<number>
  create(args: object): Promise<Record<string, unknown>>
  update(args: object): Promise<Record<string, unknown>>
  delete(args: object): Promise<unknown>
}

export interface CrudPluginOptions {
  resources: ResourceEntry[]
}

/**
 * Registers `GET /meta` plus list/options/show/create/update/delete routes
 * for every resource, under `/<resource>` (e.g. `/races`).
 */
export const crudPlugin: FastifyPluginAsync<CrudPluginOptions> = async (app, options) => {
  const registry = new ResourceRegistry(options.resources)

  app.get('/meta', async () => registry.all.map((r) => r.meta))

  for (const resource of registry.all) {
    await app.register(async (scope) => registerResourceRoutes(scope, resource), {
      prefix: `/${resource.meta.resource}`,
    })
  }
}

function delegateFor(resource: Resource): Delegate {
  return (prisma as unknown as Record<string, Delegate>)[resource.delegateKey]!
}

function omitFor(resource: Resource) {
  return resource.hidden.size ? Object.fromEntries([...resource.hidden].map((f) => [f, true])) : undefined
}

function includeFor(resource: Resource) {
  return Object.keys(resource.labelIncludes).length ? resource.labelIncludes : undefined
}

function searchWhere(resource: Resource, search: string | undefined) {
  const term = search?.trim()
  if (!term) return {}
  const or: Record<string, unknown>[] = resource.meta.searchFields.map((field) => ({
    [field]: { contains: term, mode: 'insensitive' },
  }))
  const idField = resource.meta.fields.find((f) => f.name === resource.meta.idField)!
  if (idField.type === 'String' || /^\d+$/.test(term)) {
    or.push({ [idField.name]: parseKey(idField, term) })
  }
  return or.length ? { OR: or } : {}
}

function orderBy(resource: Resource, sort: string | undefined, order: 'asc' | 'desc') {
  const field = sort ?? resource.meta.idField
  const meta = resource.meta.fields.find((f) => f.name === field)
  if (!meta || meta.kind === 'object' || meta.isList || meta.type === 'Json') {
    throw new HttpError(400, `Nije moguće sortirati po polju "${field}"`)
  }
  return { [field]: order }
}

async function registerResourceRoutes(app: FastifyInstance, resource: Resource) {
  const db = delegateFor(resource)
  const { idField, displayField } = resource.meta

  app.get<{ Querystring: Required<Pick<ListQuery, 'page' | 'pageSize' | 'order'>> & ListQuery }>(
    '/',
    { schema: { querystring: listQuerySchema } },
    async (request): Promise<ListResponse> => {
      const { page, pageSize, sort, order, search } = request.query
      const where = searchWhere(resource, search)
      const [items, total] = (await prisma.$transaction([
        db.findMany({
          where,
          orderBy: orderBy(resource, sort, order),
          skip: (page - 1) * pageSize,
          take: pageSize,
          omit: omitFor(resource),
          include: includeFor(resource),
        }) as never,
        db.count({ where }) as never,
      ])) as [Record<string, unknown>[], number]
      return { items, total, page, pageSize }
    },
  )

  app.get<{ Querystring: { search?: string; ids?: string } }>(
    '/options',
    { schema: { querystring: optionsQuerySchema } },
    async (request): Promise<OptionItem[]> => {
      const { search, ids } = request.query
      const idMeta = resource.meta.fields.find((f) => f.name === idField)!
      const where = ids
        ? { [idField]: { in: ids.split(',').filter(Boolean).map((id) => parseKey(idMeta, id)) } }
        : searchWhere(resource, search)
      const rows = await db.findMany({
        where,
        select: { [idField]: true, [displayField]: true },
        orderBy: { [displayField]: 'asc' },
        take: ids ? 100 : 20,
      })
      return rows.map((row) => ({
        value: row[idField] as string | number,
        label: String(row[displayField] ?? row[idField]),
      }))
    },
  )

  app.get<{ Params: { id: string } }>('/:id', async (request) => {
    const record = await db.findUnique({
      where: { [idField]: parseId(resource, request.params.id) },
      omit: omitFor(resource),
      include: includeFor(resource),
    })
    if (!record) throw new HttpError(404, 'Zapis nije pronađen')
    return record
  })

  app.post<{ Body: Record<string, unknown> }>(
    '/',
    { schema: { body: bodySchema(resource, 'create') } },
    async (request, reply) => {
      const record = await db.create({
        data: toPrismaData(resource, request.body, 'create'),
        omit: omitFor(resource),
      })
      return reply.code(201).send(record)
    },
  )

  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/:id',
    { schema: { body: bodySchema(resource, 'update') } },
    async (request) =>
      db.update({
        where: { [idField]: parseId(resource, request.params.id) },
        data: toPrismaData(resource, request.body, 'update'),
        omit: omitFor(resource),
      }),
  )

  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await db.delete({ where: { [idField]: parseId(resource, request.params.id) } })
    return reply.code(204).send()
  })
}
