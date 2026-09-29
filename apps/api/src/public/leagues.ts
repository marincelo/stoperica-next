import type {
  ClubStanding,
  LeagueDetail,
  LeagueRace,
  LeagueSummary,
  LeagueType,
  RaceType,
  RacerStanding,
  RacerStandingCategory,
  StandingValues,
} from '@stoperica/shared'
import type { FastifyPluginAsync } from 'fastify'
import { prisma, type Prisma } from '../db.js'
import { HttpError } from '../lib/errors.js'
import { CATEGORIES, LEAGUE_TYPES, RACE_TYPES } from './enums.js'
import { isRegistrationOpen, visibleRace } from './races.js'

const DAY_MS = 24 * 60 * 60 * 1000
const MEN = CATEGORIES.indexOf('muskarci')
const WOMEN = CATEGORIES.indexOf('zene')

const raceSelect = {
  id: true,
  name: true,
  date: true,
  endedAt: true,
  raceType: true,
  pictureUrl: true,
  registrationThreshold: true,
} satisfies Prisma.RaceSelect

const leagueSelect = {
  id: true,
  name: true,
  slug: true,
  leagueType: true,
  races: { where: visibleRace, select: raceSelect, orderBy: [{ date: 'asc' }, { id: 'asc' }] },
  clubLeaguePoints: {
    where: { total: { not: 0 } },
    orderBy: { total: 'desc' },
    take: 1,
    select: { club: { select: { name: true } } },
  },
} satisfies Prisma.LeagueSelect

type LeagueRow = Prisma.LeagueGetPayload<{ select: typeof leagueSelect }>
type RaceRow = LeagueRow['races'][number]

/** Rails shows "REZULTATI" once `ended_at` is set; older races sometimes never got it, so a past date counts too. */
const isFinished = (race: RaceRow, now: number) =>
  race.endedAt !== null || (race.date !== null && race.date.getTime() < now - DAY_MS)

const leagueType = (value: number | null) => (LEAGUE_TYPES[value ?? -1] as LeagueType | undefined) ?? null

function mostCommon<T>(values: T[]): T | null {
  const counts = new Map<T, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  let best: T | null = null
  let bestCount = 0
  for (const [value, count] of counts) if (count > bestCount) [best, bestCount] = [value, count]
  return best
}

function toSummary(league: LeagueRow, now: number): LeagueSummary {
  const races = league.races
  const finished = races.filter((r) => isFinished(r, now))
  const next = races.find((r) => !isFinished(r, now)) ?? null
  const cover = next?.pictureUrl ?? [...races].reverse().find((r) => r.pictureUrl)?.pictureUrl ?? null
  return {
    id: Number(league.id),
    slug: league.slug ?? String(league.id),
    name: league.name,
    leagueType: leagueType(league.leagueType),
    raceType: (RACE_TYPES[mostCommon(races.map((r) => r.raceType ?? -1)) ?? -1] as RaceType | undefined) ?? null,
    raceCount: races.length,
    finishedCount: finished.length,
    firstDate: races[0]?.date?.toISOString() ?? null,
    lastDate: races.at(-1)?.date?.toISOString() ?? null,
    status: next ? 'active' : 'finished',
    nextRace: next ? { id: next.id, name: next.name, date: next.date?.toISOString() ?? null } : null,
    pictureUrl: cover,
    clubLeader: league.clubLeaguePoints[0]?.club?.name ?? null,
  }
}

/** Assigns competition-ranking places ("1, 2, 3, 3, 5") to rows already sorted best-first. */
function rank<T>(sorted: T[], sameAs: (a: T, b: T) => boolean): number[] {
  const places: number[] = []
  sorted.forEach((row, index) => {
    places.push(index > 0 && sameAs(sorted[index - 1]!, row) ? places[index - 1]! : index + 1)
  })
  return places
}

function parseFinishTime(value: string | null): number | null {
  const match = value?.trim().match(/^(\d+):(\d{1,2}):(\d{1,2})(?:[.,]\d+)?$/)
  if (!match) return null
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
}

function formatSeconds(total: number): string {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function stagesWord(count: number): string {
  const lastTwo = count % 100
  const last = count % 10
  if (last === 1 && lastTwo !== 11) return 'etapa'
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return 'etape'
  return 'etapa'
}

const standingResultSelect = {
  raceId: true,
  points: true,
  finishTime: true,
  category: { select: { category: true, name: true } },
  racer: {
    select: { id: true, firstName: true, lastName: true, country: true, club: { select: { name: true } } },
  },
} satisfies Prisma.RaceResultSelect

type StandingResult = Prisma.RaceResultGetPayload<{ select: typeof standingResultSelect }>

interface RacerAccumulator {
  racer: NonNullable<StandingResult['racer']>
  byRace: Map<number, number>
  total: number
}

function groupByCategory(results: StandingResult[], allowed: number[]) {
  const groups = new Map<number, { names: string[]; racers: Map<number, RacerAccumulator> }>()
  for (const result of results) {
    const key = result.category?.category
    if (key === null || key === undefined || !allowed.includes(key) || !result.racer) continue
    let group = groups.get(key)
    if (!group) groups.set(key, (group = { names: [], racers: new Map() }))
    if (result.category?.name) group.names.push(result.category.name)
    let acc = group.racers.get(result.racer.id)
    if (!acc) group.racers.set(result.racer.id, (acc = { racer: result.racer, byRace: new Map(), total: 0 }))
    const value = result.points ?? parseFinishTime(result.finishTime)
    if (value === null || result.raceId === null) continue
    acc.byRace.set(result.raceId, (acc.byRace.get(result.raceId) ?? 0) + value)
    acc.total += value
  }
  return [...groups.entries()]
    .sort(([a], [b]) => allowed.indexOf(a) - allowed.indexOf(b))
    .map(([key, group]) => ({
      key: CATEGORIES[key] ?? String(key),
      name: mostCommon(group.names) ?? (CATEGORIES[key] ?? String(key)).toUpperCase(),
      racers: [...group.racers.values()],
    }))
}

const toRacer = (acc: RacerAccumulator): RacerStanding['racer'] => ({
  id: acc.racer.id,
  firstName: acc.racer.firstName,
  lastName: acc.racer.lastName,
  country: acc.racer.country,
  club: acc.racer.club?.name ?? null,
})

/** Rails `League#racers`: sum of points per category type, highest first. */
async function pointStandings(raceIds: number[], races: RaceRow[], allowed: number[]): Promise<RacerStandingCategory[]> {
  const results = await prisma.raceResult.findMany({
    where: { raceId: { in: raceIds }, points: { not: null }, racerId: { not: null } },
    select: standingResultSelect,
  })
  return groupByCategory(results, allowed).map(({ key, name, racers }) => {
    const sorted = racers.sort((a, b) => b.total - a.total)
    const places = rank(sorted, (a, b) => a.total === b.total)
    const leader = sorted[0]?.total ?? 0
    return {
      key,
      name,
      rows: sorted.map((acc, i) => ({
        place: places[i]!,
        racer: toRacer(acc),
        total: String(acc.total),
        gap: i === 0 || acc.total === leader ? null : `−${leader - acc.total}`,
        rounds: races.map((r) => (acc.byRace.has(r.id) ? String(acc.byRace.get(r.id)) : null)),
      })),
    }
  })
}

/** Rails `League#general_rank`: most stages completed first, then lowest total time. */
async function timeStandings(raceIds: number[], races: RaceRow[], allowed: number[]): Promise<RacerStandingCategory[]> {
  const results = await prisma.raceResult.findMany({
    where: { raceId: { in: raceIds }, racerId: { not: null }, finishTime: { not: null } },
    select: { ...standingResultSelect, points: false },
  })
  const withTimes = results
    .filter((r) => parseFinishTime(r.finishTime) !== null)
    .map((r) => ({ ...r, points: null }))
  return groupByCategory(withTimes, allowed).map(({ key, name, racers }) => {
    const sorted = racers.sort((a, b) => b.byRace.size - a.byRace.size || a.total - b.total)
    const places = rank(sorted, (a, b) => a.byRace.size === b.byRace.size && a.total === b.total)
    const leader = sorted[0]
    return {
      key,
      name,
      rows: sorted.map((acc, i) => {
        let gap: string | null = null
        if (leader && i > 0) {
          const missing = leader.byRace.size - acc.byRace.size
          gap = missing > 0 ? `−${missing} ${stagesWord(missing)}` : `+${formatSeconds(acc.total - leader.total)}`
        }
        return {
          place: places[i]!,
          racer: toRacer(acc),
          total: formatSeconds(acc.total),
          gap,
          rounds: races.map((r) => (acc.byRace.has(r.id) ? formatSeconds(acc.byRace.get(r.id)!) : null)),
        }
      }),
    }
  })
}

async function clubStandings(leagueId: bigint, races: RaceRow[]): Promise<ClubStanding[]> {
  const rows = await prisma.clubLeaguePoint.findMany({
    where: { leagueId, total: { not: 0 } },
    orderBy: { total: 'desc' },
    select: { total: true, points: true, club: { select: { id: true, name: true } } },
  })
  const clubs = rows.filter((row) => row.club)
  const places = rank(clubs, (a, b) => a.total === b.total)
  const leader = clubs[0]?.total ?? 0
  return clubs.map((row, i) => {
    const byRace = (row.points && typeof row.points === 'object' ? row.points : {}) as Record<string, unknown>
    const total = row.total ?? 0
    const values: StandingValues = {
      place: places[i]!,
      total: String(total),
      gap: i === 0 || total === leader ? null : `−${leader - total}`,
      rounds: races.map((r) => (typeof byRace[r.id] === 'number' ? String(byRace[r.id]) : null)),
    }
    return { ...values, club: { id: row.club!.id, name: row.club!.name } }
  })
}

export const publicLeagueRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (): Promise<LeagueSummary[]> => {
    const now = Date.now()
    const leagues = await prisma.league.findMany({ select: leagueSelect })
    return leagues
      .filter((league) => league.races.length > 0)
      .map((league) => toSummary(league, now))
      .sort((a, b) => (b.lastDate ?? '').localeCompare(a.lastDate ?? ''))
  })

  app.get<{ Params: { slug: string } }>(
    '/:slug',
    { schema: { params: { type: 'object', required: ['slug'], properties: { slug: { type: 'string', maxLength: 200 } } } } },
    async (request): Promise<LeagueDetail> => {
      const { slug } = request.params
      const league =
        (await prisma.league.findUnique({ where: { slug }, select: leagueSelect })) ??
        (/^\d+$/.test(slug) ? await prisma.league.findUnique({ where: { id: BigInt(slug) }, select: leagueSelect }) : null)
      if (!league || league.races.length === 0) throw new HttpError(404, 'Natjecanje nije pronađeno')

      const now = Date.now()
      const summary = toSummary(league, now)
      const races = league.races
      const raceIds = races.map((r) => r.id)
      const type = summary.leagueType

      const leagueRaces: LeagueRace[] = races.map((race, index) => {
        const finished = isFinished(race, now)
        return {
          id: race.id,
          round: index + 1,
          name: race.name,
          date: race.date?.toISOString() ?? null,
          status: finished ? 'finished' : race.id === summary.nextRace?.id ? 'next' : 'upcoming',
          registrationOpen: !finished && isRegistrationOpen(race),
        }
      })

      let racerStandings: RacerStandingCategory[] | null = null
      if (type === 'xczld') {
        const allowed = CATEGORIES.map((_, i) => i).filter((i) => i !== MEN)
        racerStandings = await pointStandings(raceIds, races, allowed)
      } else if (type === 'trail') {
        racerStandings = await pointStandings(raceIds, races, [WOMEN, MEN])
      } else if (type === 'stage_competitors_only') {
        const firstRaceCategories = await prisma.category.findMany({
          where: { raceId: races[0]!.id, category: { not: null } },
          orderBy: { id: 'asc' },
          select: { category: true },
        })
        const allowed = [...new Set(firstRaceCategories.map((c) => c.category!))]
        racerStandings = await timeStandings(raceIds, races, allowed)
      }

      const clubs = type === 'trail' || type === 'stage_competitors_only' ? [] : await clubStandings(league.id, races)
      const racerCount = (
        await prisma.raceResult.findMany({
          where: { raceId: { in: raceIds }, racerId: { not: null } },
          distinct: ['racerId'],
          select: { racerId: true },
        })
      ).length

      return {
        ...summary,
        races: leagueRaces,
        racerCount,
        standingsMode: type === 'stage_competitors_only' ? 'time' : 'points',
        racerStandings: racerStandings?.length ? racerStandings : null,
        clubStandings: clubs.length ? clubs : null,
      }
    },
  )
}
