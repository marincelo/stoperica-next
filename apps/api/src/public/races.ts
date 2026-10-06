import type {
  ListResponse,
  PublicCategory,
  PublicRaceDetail,
  PublicRaceSummary,
  PublicResult,
  RaceType,
} from '@stoperica/shared'
import type { FastifyPluginAsync } from 'fastify'
import { prisma, type Prisma } from '../db.js'
import { HttpError } from '../lib/errors.js'
import { sendRegistrationEmail } from '../mail/messages.js'
import { NO_UCI_ID } from '../auth/profile.js'
import { LEAGUE_TYPES, RACE_TYPES, RESULT_STATUS } from './enums.js'
import { getLiveRace } from './live.js'
import { presentRacePage, racePageCache, type CachedRacePage } from './raceCache.js'
import { computeSplits } from './splits.js'

export const visibleRace = { OR: [{ hidden: false }, { hidden: null }] } satisfies Prisma.RaceWhereInput

const summarySelect = {
  id: true,
  name: true,
  date: true,
  raceType: true,
  pictureUrl: true,
  locationUrl: true,
  descriptionUrl: true,
  registrationThreshold: true,
  league: { select: { id: true, name: true, slug: true, leagueType: true } },
  _count: { select: { raceResults: true } },
} satisfies Prisma.RaceSelect

type SummaryRow = Prisma.RaceGetPayload<{ select: typeof summarySelect }>

export const isRegistrationOpen = (race: { registrationThreshold: Date | null }) =>
  race.registrationThreshold !== null && Date.now() < race.registrationThreshold.getTime()

function toSummary(race: SummaryRow): PublicRaceSummary {
  return {
    id: race.id,
    name: race.name,
    date: race.date?.toISOString() ?? null,
    raceType: (RACE_TYPES[race.raceType ?? -1] as RaceType | undefined) ?? null,
    pictureUrl: race.pictureUrl,
    locationUrl: race.locationUrl,
    descriptionUrl: race.descriptionUrl,
    registrationThreshold: race.registrationThreshold?.toISOString() ?? null,
    registrationOpen: isRegistrationOpen(race),
    league: race.league ? { id: Number(race.league.id), name: race.league.name, slug: race.league.slug } : null,
    registeredCount: race._count.raceResults,
  }
}

const resultSelect = {
  id: true,
  status: true,
  position: true,
  finishTime: true,
  finishDelta: true,
  points: true,
  additionalPoints: true,
  lapTimes: true,
  startedAt: true,
  createdAt: true,
  categoryId: true,
  startNumber: { select: { id: true, value: true } },
  racer: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      gender: true,
      country: true,
      uciId: true,
      club: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.RaceResultSelect

type ResultRow = Prisma.RaceResultGetPayload<{ select: typeof resultSelect }>

interface ResultContext {
  raceType: RaceType | null
  millisDisplay: boolean
  uciDisplay: boolean
  raceStartedAt: Date | null
  controlPoints: unknown[]
}

function toResult(row: ResultRow, ctx: ResultContext): PublicResult {
  const hasPoints = row.points !== null || row.additionalPoints !== null
  const racer = row.racer!
  const unlicensed = !racer.uciId || racer.uciId === NO_UCI_ID
  const individual = ctx.uciDisplay && unlicensed
  return {
    id: row.id,
    status: row.status,
    position: row.position,
    finishTime: row.finishTime,
    finishDelta: row.finishDelta,
    points: hasPoints ? (row.points ?? 0) + (row.additionalPoints ?? 0) : null,
    startNumber: row.startNumber?.value ?? null,
    startNumberId: row.startNumber?.id ?? null,
    racer: {
      id: racer.id,
      firstName: racer.firstName,
      lastName: racer.lastName,
      gender: racer.gender,
      country: racer.country,
      // Rails `Racer#club_name(is_uci)`: unlicensed racers are "Individual" in UCI races.
      club: individual ? 'Individual' : (racer.club?.name ?? null),
      clubId: individual ? null : (racer.club?.id ?? null),
      uciId: ctx.uciDisplay && !unlicensed ? racer.uciId : null,
    },
    splits: computeSplits({ ...ctx, result: row }),
  }
}

/** Mirrors Rails `Race#sorted_results`: newest registrations first before the start, then by position/status. */
export function sortResults<T extends Pick<ResultRow, 'position' | 'status' | 'createdAt'>>(rows: T[], started: boolean): T[] {
  if (!started) return [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  const placed = rows.filter((r) => r.position !== null).sort((a, b) => a.position! - b.position!)
  const rest = rows.filter((r) => r.position === null).sort((a, b) => (b.status ?? 0) - (a.status ?? 0))
  return [...placed, ...rest]
}

async function findVisibleRace(id: number) {
  const race = await prisma.race.findFirst({
    where: { id, ...visibleRace },
    select: {
      ...summarySelect,
      descriptionText: true,
      startedAt: true,
      endedAt: true,
      millisDisplay: true,
      uciDisplay: true,
      controlPoints: true,
      lockRaceResults: true,
      sendEmail: true,
      emailBody: true,
      categories: { select: { id: true, name: true, trackLength: true }, orderBy: { id: 'asc' } },
    },
  })
  if (!race) throw new HttpError(404, 'Utrka nije pronađena')
  return race
}

/** Shared race-page payload. `registrationOpen`, `cancellationAllowed` and `myRegistration` are added per request. */
async function loadRacePage(id: number): Promise<CachedRacePage> {
  const race = await findVisibleRace(id)
  const rows = await prisma.raceResult.findMany({
    where: { raceId: race.id, racerId: { not: null } },
    select: resultSelect,
  })

  const started = race.startedAt !== null
  const { registrationOpen: _registrationOpen, ...summary } = toSummary(race)
  const ctx: ResultContext = {
    raceType: summary.raceType,
    millisDisplay: race.millisDisplay ?? false,
    uciDisplay: race.uciDisplay ?? false,
    raceStartedAt: race.startedAt,
    controlPoints: race.controlPoints,
  }
  const toResults = (list: ResultRow[]) => sortResults(list, started).map((row) => toResult(row, ctx))

  const groups: PublicCategory[] = race.categories.map((category) => ({
    id: category.id,
    name: category.name ?? `Kategorija ${category.id}`,
    trackLength: category.trackLength,
    results: toResults(rows.filter((r) => r.categoryId === category.id)),
  }))
  const categoryIds = new Set(race.categories.map((c) => c.id))
  const uncategorized = rows.filter((r) => r.categoryId === null || !categoryIds.has(r.categoryId))
  if (uncategorized.length) {
    groups.push({ id: null, name: 'Bez kategorije', trackLength: null, results: toResults(uncategorized) })
  }

  return {
    ...summary,
    descriptionText: race.descriptionText,
    startedAt: race.startedAt?.toISOString() ?? null,
    endedAt: race.endedAt?.toISOString() ?? null,
    millisDisplay: ctx.millisDisplay,
    uciDisplay: ctx.uciDisplay,
    waiverRequired: LEAGUE_TYPES[race.league?.leagueType ?? -1] === 'xczld',
    lockRaceResults: race.lockRaceResults ?? false,
    categories: groups,
  }
}

const idParams = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'integer', minimum: 1 } },
} as const

export const publicRaceRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { scope: 'upcoming' | 'past'; page: number; pageSize: number } }>(
    '/',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            scope: { type: 'string', enum: ['upcoming', 'past'], default: 'upcoming' },
            page: { type: 'integer', minimum: 1, default: 1 },
            pageSize: { type: 'integer', minimum: 1, maximum: 48, default: 12 },
          },
        },
      },
    },
    async (request): Promise<ListResponse<PublicRaceSummary>> => {
      const { scope, page, pageSize } = request.query
      const now = new Date()
      const where: Prisma.RaceWhereInput = {
        ...visibleRace,
        date: scope === 'upcoming' ? { gte: now } : { lt: now },
      }
      const [rows, total] = await prisma.$transaction([
        prisma.race.findMany({
          where,
          select: summarySelect,
          orderBy: { date: scope === 'upcoming' ? 'asc' : 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.race.count({ where }),
      ])
      return { items: rows.map(toSummary), total, page, pageSize }
    },
  )

  app.get('/live', async () => getLiveRace())

  app.get<{ Params: { id: number } }>(
    '/:id',
    { schema: { params: idParams }, onRequest: app.optionalAuth },
    async (request): Promise<PublicRaceDetail> => {
      let cached = racePageCache.get(request.params.id)
      if (!cached) {
        cached = await loadRacePage(request.params.id)
        racePageCache.set(request.params.id, cached)
      }
      return presentRacePage(cached, request.session?.id)
    },
  )

  app.post<{ Params: { id: number }; Body: { categoryId: number; waiverAccepted?: boolean } }>(
    '/:id/registration',
    {
      onRequest: app.authenticate,
      schema: {
        params: idParams,
        body: {
          type: 'object',
          required: ['categoryId'],
          additionalProperties: false,
          properties: { categoryId: { type: 'integer' }, waiverAccepted: { type: 'boolean' } },
        },
      },
    },
    async (request, reply) => {
      const racerId = request.session!.id
      const race = await findVisibleRace(request.params.id)
      if (!isRegistrationOpen(race)) throw new HttpError(409, 'Prijave za ovu utrku su zatvorene')
      if (!race.categories.some((c) => c.id === request.body.categoryId)) {
        throw new HttpError(400, 'Odabrana kategorija ne pripada utrci')
      }
      const leagueType = LEAGUE_TYPES[race.league?.leagueType ?? -1]
      if (leagueType === 'xczld' && !request.body.waiverAccepted) {
        throw new HttpError(400, 'Potrebno je prihvatiti izjavu o odgovornosti')
      }
      if (await prisma.raceResult.findFirst({ where: { raceId: race.id, racerId }, select: { id: true } })) {
        throw new HttpError(409, 'Već ste prijavljeni na ovu utrku')
      }

      // Rails `assign_league_number`: XCZLD racers keep their start number across the league's races.
      let startNumberId: number | null = null
      if (leagueType === 'xczld' && race.league) {
        const previous = await prisma.raceResult.findFirst({
          where: { racerId, startNumberId: { not: null }, race: { leagueId: race.league.id } },
          select: { startNumberId: true },
        })
        startNumberId = previous?.startNumberId ?? null
      }

      const created = await prisma.raceResult.create({
        data: {
          raceId: race.id,
          racerId,
          categoryId: request.body.categoryId,
          status: RESULT_STATUS.registered,
          startNumberId,
          createdAt: new Date(),
        },
        select: { id: true, categoryId: true, status: true },
      })
      racePageCache.invalidate(race.id)

      sendRegistrationEmail(race, request.session!.email)
      return reply.code(201).send(created)
    },
  )

  app.delete<{ Params: { id: number } }>(
    '/:id/registration',
    { onRequest: app.authenticate, schema: { params: idParams } },
    async (request, reply) => {
      const race = await findVisibleRace(request.params.id)
      if (!isRegistrationOpen(race) || race.lockRaceResults) {
        throw new HttpError(409, 'Odjava s ove utrke više nije moguća')
      }
      const { count } = await prisma.raceResult.deleteMany({
        where: { raceId: race.id, racerId: request.session!.id },
      })
      if (!count) throw new HttpError(404, 'Niste prijavljeni na ovu utrku')
      racePageCache.invalidate(race.id)
      return reply.code(204).send()
    },
  )
}
