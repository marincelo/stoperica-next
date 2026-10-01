import type { LiveRace, LiveResult, RaceType } from '@stoperica/shared'
import { NO_UCI_ID } from '../auth/profile.js'
import { prisma, type Prisma } from '../db.js'
import { liveTime } from '../timing/laps.js'
import { RACE_TYPES } from './enums.js'
import { liveRaceCache } from './raceCache.js'

const visibleRace = { OR: [{ hidden: false }, { hidden: null }] } satisfies Prisma.RaceWhereInput

/** Cached until a write in this process invalidates the race page (laps, race, results, …). */
export async function getLiveRace(): Promise<LiveRace | null> {
  const hit = liveRaceCache.get()
  if (hit) return hit.payload
  const payload = await loadLiveRace()
  liveRaceCache.set(payload)
  return payload
}

/** The in-progress race: `startedAt` set, `endedAt` still empty. */
export async function loadLiveRace(): Promise<LiveRace | null> {
  const race = await prisma.race.findFirst({
    where: { ...visibleRace, startedAt: { not: null }, endedAt: null },
    orderBy: { startedAt: 'desc' },
    select: {
      id: true,
      name: true,
      startedAt: true,
      uciDisplay: true,
      millisDisplay: true,
      raceType: true,
      controlPoints: true,
      categories: { select: { name: true }, orderBy: { id: 'asc' } },
    },
  })
  if (!race?.startedAt) return null

  const raceType = (RACE_TYPES[race.raceType ?? -1] as RaceType | undefined) ?? null
  const xco = raceType === 'xco'
  const uciDisplay = race.uciDisplay ?? false
  const millisDisplay = race.millisDisplay ?? false
  const controlPoints = race.controlPoints

  const rows = await prisma.raceResult.findMany({
    where: { raceId: race.id, racerId: { not: null }, startNumberId: { not: null } },
    select: {
      id: true,
      status: true,
      lapTimes: true,
      startedAt: true,
      startNumber: { select: { value: true } },
      category: { select: { name: true } },
      racer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          gender: true,
          country: true,
          uciId: true,
          club: { select: { name: true } },
        },
      },
    },
  })

  const results: LiveResult[] = rows.map((row) => {
    const racer = row.racer!
    const unlicensed = !racer.uciId || racer.uciId === NO_UCI_ID
    const club = uciDisplay && unlicensed ? 'Individual' : (racer.club?.name ?? 'Individual')
    return {
      id: row.id,
      status: row.status,
      startNumber: row.startNumber?.value ?? null,
      category: row.category?.name ?? '—',
      racer: {
        id: racer.id,
        firstName: racer.firstName,
        lastName: racer.lastName,
        gender: racer.gender,
        country: racer.country,
        club,
        uciId: uciDisplay && !unlicensed ? racer.uciId : null,
      },
      liveTime: liveTime({
        laps: row.lapTimes,
        status: row.status,
        startedAt: row.startedAt,
        raceStartedAt: race.startedAt,
        millisDisplay,
        xco,
        controlPoints,
      }),
    }
  })

  return {
    id: race.id,
    name: race.name,
    startedAt: race.startedAt.toISOString(),
    uciDisplay,
    categories: race.categories.map((c) => c.name).filter((name): name is string => Boolean(name)),
    results,
  }
}
