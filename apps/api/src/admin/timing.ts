import type { ListResponse, TimingCategory, TimingCounts, TimingLap, TimingRace, TimingRaceSummary, TimingResult } from '@stoperica/shared'
import type { FastifyPluginAsync } from 'fastify'
import { prisma, type Prisma } from '../db.js'
import { HttpError } from '../lib/errors.js'
import { LEAGUE_TYPES, RACE_TYPES, RESULT_STATUS } from '../public/enums.js'
import { racePageCache } from '../public/raceCache.js'
import { planRefresh, type ResultUpdate } from '../timing/refresh.js'

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

const categoryParams = {
  type: 'object',
  required: ['raceId', 'categoryId'],
  properties: {
    raceId: { type: 'integer', minimum: 1 },
    categoryId: { type: 'integer', minimum: 1 },
  },
} as const

const searchQuery = {
  type: 'object',
  properties: { q: { type: 'string' } },
} as const

const RACE_PAGE_SIZE = 10

const racesQuery = {
  type: 'object',
  properties: {
    q: { type: 'string' },
    page: { type: 'integer', minimum: 1, default: 1 },
  },
} as const

const registerBody = {
  type: 'object',
  required: ['racerId', 'categoryId'],
  additionalProperties: false,
  properties: {
    racerId: { type: 'integer', minimum: 1 },
    categoryId: { type: 'integer', minimum: 1 },
  },
} as const

const patchBody = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'integer', minimum: 1, maximum: 6 },
    laps: {
      type: 'array',
      items: {
        type: 'object',
        required: ['time', 'readerId'],
        additionalProperties: false,
        properties: {
          time: { type: 'number' },
          readerId: { type: 'string', maxLength: 40 },
        },
      },
    },
  },
} as const

function lapTime(entry: unknown): number | null {
  const raw =
    typeof entry === 'number'
      ? entry
      : entry && typeof entry === 'object' && 'time' in entry
        ? Number((entry as { time: unknown }).time)
        : NaN
  return Number.isFinite(raw) ? raw : null
}

function readerIdOf(entry: unknown): string {
  if (entry && typeof entry === 'object' && 'reader_id' in entry) {
    return String((entry as { reader_id: unknown }).reader_id ?? '')
  }
  return '0'
}

function toLaps(raw: unknown): TimingLap[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((entry) => {
    const time = lapTime(entry)
    return time === null ? [] : [{ time, readerId: readerIdOf(entry) }]
  })
}

function categoryStart(rows: { startedAt: Date | null }[]): { startedAt: string | null; mixedStart: boolean } {
  if (!rows.length) return { startedAt: null, mixedStart: false }
  const stamps = new Set(rows.map((row) => row.startedAt?.toISOString() ?? null))
  if (stamps.size === 1) {
    const only = rows[0]!.startedAt
    return { startedAt: only ? only.toISOString() : null, mixedStart: false }
  }
  return { startedAt: null, mixedStart: true }
}

function countsOf(rows: { status: number | null; startNumberId: number | null }[]): TimingCounts {
  const count = (status: number) => rows.filter((row) => row.status === status).length
  return {
    total: rows.length,
    registered: count(RESULT_STATUS.registered),
    atStart: count(RESULT_STATUS.atStart),
    finished: count(RESULT_STATUS.finished),
    dnf: count(RESULT_STATUS.dnf),
    dsq: count(RESULT_STATUS.dsq),
    dns: count(RESULT_STATUS.dns),
    missingBib: rows.filter((row) => row.startNumberId === null).length,
  }
}

const resultSelect = {
  id: true,
  status: true,
  startedAt: true,
  startNumberId: true,
  categoryId: true,
  lapTimes: true,
  racer: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      gender: true,
      country: true,
      club: { select: { name: true } },
    },
  },
} satisfies Prisma.RaceResultSelect

type ResultRow = Prisma.RaceResultGetPayload<{ select: typeof resultSelect }>

function toResult(row: ResultRow): TimingResult {
  return {
    id: row.id,
    status: row.status,
    startedAt: row.startedAt?.toISOString() ?? null,
    startNumberId: row.startNumberId,
    categoryId: row.categoryId,
    laps: toLaps(row.lapTimes),
    racer: row.racer
      ? {
          id: row.racer.id,
          firstName: row.racer.firstName,
          lastName: row.racer.lastName,
          gender: row.racer.gender,
          country: row.racer.country,
          club: row.racer.club?.name ?? null,
        }
      : null,
  }
}

export const timingRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { q?: string; page?: number } }>(
    '/races',
    { schema: { querystring: racesQuery } },
    async (request): Promise<ListResponse<TimingRaceSummary>> => {
      const q = request.query.q?.trim()
      const page = request.query.page ?? 1
      const where: Prisma.RaceWhereInput = q ? { name: { contains: q, mode: 'insensitive' } } : {}
      const [races, total] = await prisma.$transaction([
        prisma.race.findMany({
          where,
          orderBy: [{ date: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
          skip: (page - 1) * RACE_PAGE_SIZE,
          take: RACE_PAGE_SIZE,
          select: {
            id: true,
            name: true,
            date: true,
            startedAt: true,
            endedAt: true,
            _count: { select: { raceResults: true } },
          },
        }),
        prisma.race.count({ where }),
      ])
      return {
        items: races.map((race) => ({
          id: race.id,
          name: race.name,
          date: race.date?.toISOString() ?? null,
          startedAt: race.startedAt?.toISOString() ?? null,
          endedAt: race.endedAt?.toISOString() ?? null,
          registeredCount: race._count.raceResults,
        })),
        total,
        page,
        pageSize: RACE_PAGE_SIZE,
      }
    },
  )

  app.get<{ Querystring: { q?: string } }>(
    '/racers',
    { schema: { querystring: searchQuery } },
    async (request) => {
      const q = request.query.q?.trim() ?? ''
      if (q.length < 2) return []
      const id = Number(q)
      const racers = await prisma.racer.findMany({
        where: {
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            ...(Number.isInteger(id) && id > 0 ? [{ id }] : []),
          ],
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take: 20,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          country: true,
          club: { select: { name: true } },
        },
      })
      return racers.map((racer) => ({
        id: racer.id,
        firstName: racer.firstName,
        lastName: racer.lastName,
        country: racer.country,
        club: racer.club?.name ?? null,
      }))
    },
  )

  app.get<{ Params: { raceId: number } }>(
    '/races/:raceId',
    { schema: { params: raceParams } },
    async (request): Promise<TimingRace> => {
      const raceId = request.params.raceId
      const race = await prisma.race.findUnique({
        where: { id: raceId },
        select: {
          id: true,
          name: true,
          date: true,
          startedAt: true,
          endedAt: true,
          categories: { select: { id: true, name: true }, orderBy: { id: 'asc' } },
        },
      })
      if (!race) throw new HttpError(404, 'Utrka nije pronađena')

      const rows = await prisma.raceResult.findMany({
        where: { raceId },
        select: resultSelect,
        orderBy: { id: 'asc' },
      })
      const results = rows.map(toResult)
      const categories: TimingCategory[] = race.categories.map((category) => {
        const mine = rows.filter((row) => row.categoryId === category.id)
        return { id: category.id, name: category.name, count: mine.length, ...categoryStart(mine) }
      })

      return {
        id: race.id,
        name: race.name,
        date: race.date?.toISOString() ?? null,
        startedAt: race.startedAt?.toISOString() ?? null,
        endedAt: race.endedAt?.toISOString() ?? null,
        counts: countsOf(rows),
        categories,
        results,
      }
    },
  )

  app.post<{ Params: { raceId: number; categoryId: number } }>(
    '/races/:raceId/categories/:categoryId/start',
    { schema: { params: categoryParams } },
    async (request) => {
      const { raceId, categoryId } = request.params
      const category = await prisma.category.findFirst({
        where: { id: categoryId, raceId },
        select: { id: true },
      })
      if (!category) throw new HttpError(404, 'Kategorija nije pronađena')

      const startedAt = new Date()
      const updated = await prisma.raceResult.updateMany({
        where: { raceId, categoryId },
        data: { startedAt },
      })
      racePageCache.invalidate(raceId)
      return { startedAt: startedAt.toISOString(), updated: updated.count }
    },
  )

  app.post<{ Params: { raceId: number }; Body: { racerId: number; categoryId: number } }>(
    '/races/:raceId/results',
    { schema: { params: raceParams, body: registerBody } },
    async (request, reply) => {
      const raceId = request.params.raceId
      const { racerId, categoryId } = request.body
      const race = await prisma.race.findUnique({
        where: { id: raceId },
        select: { id: true, leagueId: true, league: { select: { leagueType: true } } },
      })
      if (!race) throw new HttpError(404, 'Utrka nije pronađena')
      const category = await prisma.category.findFirst({
        where: { id: categoryId, raceId },
        select: { id: true },
      })
      if (!category) throw new HttpError(400, 'Odabrana kategorija ne pripada utrci')
      const racer = await prisma.racer.findUnique({ where: { id: racerId }, select: { id: true } })
      if (!racer) throw new HttpError(404, 'Natjecatelj nije pronađen')
      const existing = await prisma.raceResult.findFirst({
        where: { raceId, racerId },
        select: { id: true },
      })
      if (existing) throw new HttpError(409, 'Natjecatelj je već prijavljen na ovu utrku')

      let startNumberId: number | null = null
      const leagueType = LEAGUE_TYPES[race.league?.leagueType ?? -1]
      if (leagueType === 'xczld' && race.leagueId) {
        const previous = await prisma.raceResult.findFirst({
          where: { racerId, startNumberId: { not: null }, race: { leagueId: race.leagueId } },
          select: { startNumberId: true },
        })
        const carried = previous?.startNumberId ?? null
        const taken =
          carried !== null &&
          (await prisma.raceResult.findFirst({
            where: { raceId, startNumberId: carried },
            select: { id: true },
          }))
        if (!taken) startNumberId = carried
      }

      const created = await prisma.raceResult.create({
        data: {
          raceId,
          racerId,
          categoryId,
          status: RESULT_STATUS.registered,
          startNumberId,
          createdAt: new Date(),
        },
        select: { id: true },
      })
      racePageCache.invalidate(raceId)
      return reply.code(201).send(created)
    },
  )

  app.patch<{
    Params: { raceId: number; resultId: number }
    Body: { status?: number; laps?: TimingLap[] }
  }>(
    '/races/:raceId/results/:resultId',
    { schema: { params: resultParams, body: patchBody } },
    async (request) => {
      const { raceId, resultId } = request.params
      const { status, laps } = request.body
      if (status === undefined && laps === undefined) throw new HttpError(400, 'Nema izmjena')
      const result = await prisma.raceResult.findFirst({
        where: { id: resultId, raceId },
        select: { id: true },
      })
      if (!result) throw new HttpError(404, 'Rezultat nije pronađen')
      if (laps?.some((lap) => !Number.isFinite(lap.time) || lap.time < 0)) {
        throw new HttpError(400, 'Vrijeme kruga mora biti nenegativan broj')
      }

      const data: Prisma.RaceResultUpdateInput = {}
      if (status !== undefined) data.status = status
      if (laps !== undefined) {
        data.lapTimes = laps.map((lap) => ({ time: lap.time, reader_id: lap.readerId || '0' })) as Prisma.InputJsonValue
      }
      await prisma.raceResult.update({ where: { id: resultId }, data })
      racePageCache.invalidate(raceId)
      return { ok: true }
    },
  )

  app.post<{ Params: { raceId: number } }>(
    '/races/:raceId/recalculate',
    { schema: { params: raceParams } },
    async (request) => {
      const raceId = request.params.raceId
      const race = await prisma.race.findUnique({
        where: { id: raceId },
        select: {
          id: true,
          raceType: true,
          millisDisplay: true,
          startedAt: true,
          pointsMultiplier: true,
          league: { select: { leagueType: true } },
          categories: { select: { id: true, category: true } },
          raceResults: {
            select: {
              id: true,
              categoryId: true,
              status: true,
              position: true,
              points: true,
              additionalPoints: true,
              finishTime: true,
              finishDelta: true,
              missedControlPoints: true,
              lapTimes: true,
              startedAt: true,
              racer: { select: { gender: true, clubId: true } },
            },
          },
        },
      })
      if (!race) throw new HttpError(404, 'Utrka nije pronađena')

      const leagueType = LEAGUE_TYPES[race.league?.leagueType ?? -1] ?? null
      const clubPoints =
        leagueType === 'xczld' || leagueType === 'lead' || leagueType === 'running'
          ? await prisma.clubLeaguePoint.findMany({
              where: { league: { races: { some: { id: raceId } } } },
              select: { id: true, clubId: true, points: true },
            })
          : []

      const plan = planRefresh({
        raceId,
        raceType: RACE_TYPES[race.raceType ?? -1] ?? null,
        millisDisplay: race.millisDisplay ?? false,
        startedAt: race.startedAt,
        pointsMultiplier: race.pointsMultiplier,
        leagueType,
        categories: race.categories.map((category) => ({ id: category.id, kind: category.category })),
        results: race.raceResults.map((row) => ({
          id: row.id,
          categoryId: row.categoryId,
          status: row.status,
          position: row.position,
          points: row.points,
          additionalPoints: row.additionalPoints,
          finishTime: row.finishTime,
          finishDelta: row.finishDelta,
          missedControlPoints: row.missedControlPoints,
          lapTimes: row.lapTimes,
          startedAt: row.startedAt,
          gender: row.racer?.gender ?? null,
          clubId: row.racer?.clubId ?? null,
        })),
        clubPoints,
      })

      const dataOf = (update: ResultUpdate): Prisma.RaceResultUpdateInput => ({
        ...(update.position !== undefined ? { position: update.position } : {}),
        ...(update.finishTime !== undefined ? { finishTime: update.finishTime } : {}),
        ...(update.finishDelta !== undefined ? { finishDelta: update.finishDelta } : {}),
        ...(update.points !== undefined ? { points: update.points } : {}),
        ...(update.additionalPoints !== undefined ? { additionalPoints: update.additionalPoints } : {}),
      })

      await prisma.$transaction(
        async (tx) => {
          for (const update of plan.results) {
            await tx.raceResult.update({ where: { id: update.id }, data: dataOf(update) })
          }
          for (const update of plan.clubPoints) {
            await tx.clubLeaguePoint.update({
              where: { id: update.id },
              data: { points: update.points, total: update.total },
            })
          }
        },
        { timeout: 20_000 },
      )
      racePageCache.invalidate(raceId)
      return { updated: plan.results.length }
    },
  )

  app.delete<{ Params: { raceId: number; resultId: number } }>(
    '/races/:raceId/results/:resultId',
    { schema: { params: resultParams } },
    async (request, reply) => {
      const { raceId, resultId } = request.params
      const result = await prisma.raceResult.findFirst({
        where: { id: resultId, raceId },
        select: { id: true },
      })
      if (!result) throw new HttpError(404, 'Rezultat nije pronađen')
      await prisma.raceResult.delete({ where: { id: resultId } })
      racePageCache.invalidate(raceId)
      return reply.code(204).send()
    },
  )
}
