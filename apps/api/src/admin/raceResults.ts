import type { RaceStartNumberOption } from '@stoperica/shared'
import type { FastifyPluginAsync } from 'fastify'
import { prisma, type Prisma } from '../db.js'
import { HttpError } from '../lib/errors.js'
import { racePageCache } from '../public/raceCache.js'

const raceParams = {
  type: 'object',
  required: ['raceId'],
  properties: { raceId: { type: 'integer', minimum: 1 } },
} as const

const resultParams = {
  type: 'object',
  required: ['raceId', 'resultId'],
  properties: {
    raceId: { type: 'integer', minimum: 1 },
    resultId: { type: 'integer', minimum: 1 },
  },
} as const

const assignBody = {
  type: 'object',
  required: ['startNumberId'],
  additionalProperties: false,
  properties: { startNumberId: { type: ['integer', 'null'] } },
} as const

function racerName(racer: { firstName: string | null; lastName: string | null } | null): string {
  return [racer?.firstName, racer?.lastName].filter(Boolean).join(' ') || '—'
}

/**
 * Bibs for a race come from its pool. A race without a pool uses the single pool
 * its results already draw from, otherwise bibs linked directly to the race.
 */
async function bibPoolId(raceId: number, assignedIds: number[]): Promise<bigint | null> {
  const race = await prisma.race.findUnique({ where: { id: raceId }, select: { poolId: true } })
  if (!race) throw new HttpError(404, 'Utrka nije pronađena')
  if (race.poolId) return race.poolId
  if (!assignedIds.length) return null
  const pools = await prisma.startNumber.findMany({
    where: { id: { in: assignedIds }, poolId: { not: null } },
    select: { poolId: true },
    distinct: ['poolId'],
  })
  return pools.length === 1 ? pools[0]!.poolId : null
}

async function assignedOnRace(raceId: number) {
  return prisma.raceResult.findMany({
    where: { raceId, startNumberId: { not: null } },
    select: {
      id: true,
      startNumberId: true,
      racer: { select: { firstName: true, lastName: true } },
    },
  })
}

function numberWhere(raceId: number, poolId: bigint | null, assignedIds: number[]): Prisma.StartNumberWhereInput {
  if (poolId) return assignedIds.length ? { OR: [{ poolId }, { id: { in: assignedIds } }] } : { poolId }
  return assignedIds.length ? { OR: [{ raceId }, { id: { in: assignedIds } }] } : { raceId }
}

export const raceResultRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { raceId: number } }>(
    '/races/:raceId/start-numbers',
    { schema: { params: raceParams } },
    async (request): Promise<RaceStartNumberOption[]> => {
      const raceId = request.params.raceId
      const assigned = await assignedOnRace(raceId)
      const assignedIds = assigned.map((row) => row.startNumberId!)
      const poolId = await bibPoolId(raceId, assignedIds)
      const takenBy = new Map(assigned.map((row) => [row.startNumberId!, racerName(row.racer)]))
      const numbers = await prisma.startNumber.findMany({
        where: numberWhere(raceId, poolId, assignedIds),
        select: { id: true, value: true },
      })
      return numbers
        .map((number) => ({
          id: number.id,
          value: number.value ?? String(number.id),
          takenBy: takenBy.get(number.id) ?? null,
        }))
        .sort((a, b) => a.value.localeCompare(b.value, 'hr', { numeric: true }))
    },
  )

  app.patch<{ Params: { raceId: number; resultId: number }; Body: { startNumberId: number | null } }>(
    '/races/:raceId/results/:resultId',
    { schema: { params: resultParams, body: assignBody } },
    async (request) => {
      const { raceId, resultId } = request.params
      const { startNumberId } = request.body
      const result = await prisma.raceResult.findFirst({
        where: { id: resultId, raceId },
        select: { id: true, startNumberId: true },
      })
      if (!result) throw new HttpError(404, 'Rezultat nije pronađen')
      if (startNumberId === result.startNumberId) return { startNumberId, startNumber: null }

      if (startNumberId !== null) {
        const assigned = await assignedOnRace(raceId)
        const poolId = await bibPoolId(raceId, assigned.map((row) => row.startNumberId!))
        const number = await prisma.startNumber.findUnique({
          where: { id: startNumberId },
          select: { id: true, value: true, poolId: true, raceId: true },
        })
        const inPool = poolId !== null && number?.poolId === poolId
        const onRace = number?.raceId === raceId
        const alreadyHere = number?.id === result.startNumberId
        if (!number || (!inPool && !onRace && !alreadyHere)) {
          throw new HttpError(400, 'Broj ne pripada bazi ove utrke')
        }
        const clash = assigned.find((row) => row.startNumberId === startNumberId && row.id !== resultId)
        if (clash) throw new HttpError(409, 'Broj je već dodijeljen drugom natjecatelju')
        await prisma.raceResult.update({ where: { id: resultId }, data: { startNumberId } })
        racePageCache.invalidate(raceId)
        return { startNumberId, startNumber: number.value }
      }

      await prisma.raceResult.update({ where: { id: resultId }, data: { startNumberId: null } })
      racePageCache.invalidate(raceId)
      return { startNumberId: null, startNumber: null }
    },
  )
}
