import type { RaceType } from '@stoperica/shared'
import { NO_UCI_ID } from '../auth/profile.js'
import { prisma, type Prisma } from '../db.js'
import { HttpError } from '../lib/errors.js'
import { GENDER, RACE_TYPES, RESULT_STATUS } from '../public/enums.js'
import { sortResults } from '../public/races.js'
import { countryName, iocCode } from './countries.js'

const exportResultSelect = {
  id: true,
  status: true,
  position: true,
  finishTime: true,
  finishDelta: true,
  lapTimes: true,
  createdAt: true,
  categoryId: true,
  category: { select: { name: true } },
  startNumber: { select: { value: true } },
  racer: {
    select: {
      firstName: true,
      lastName: true,
      gender: true,
      country: true,
      uciId: true,
      yearOfBirth: true,
      monthOfBirth: true,
      dayOfBirth: true,
      email: true,
      phoneNumber: true,
      address: true,
      zipCode: true,
      town: true,
      shirtSize: true,
      personalBest: true,
      club: { select: { name: true } },
    },
  },
} satisfies Prisma.RaceResultSelect

export type ExportResult = Prisma.RaceResultGetPayload<{ select: typeof exportResultSelect }>
export type ExportRacer = NonNullable<ExportResult['racer']>

export interface ExportRace {
  id: number
  name: string
  raceType: RaceType | null
  uciDisplay: boolean
  started: boolean
  /** Every registration, in registration order. */
  results: (ExportResult & { racer: ExportRacer })[]
  /** Non-empty categories in race order, each with results sorted like the public results page. */
  byCategory: { name: string; results: (ExportResult & { racer: ExportRacer })[] }[]
}

/** Admins can export hidden races too, so this doesn't filter on visibility. */
export async function loadExportRace(id: number): Promise<ExportRace> {
  const race = await prisma.race.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      raceType: true,
      uciDisplay: true,
      startedAt: true,
      categories: { select: { id: true, name: true }, orderBy: { id: 'asc' } },
    },
  })
  if (!race) throw new HttpError(404, 'Utrka nije pronađena')

  const rows = await prisma.raceResult.findMany({
    where: { raceId: race.id, racerId: { not: null } },
    select: exportResultSelect,
    orderBy: { id: 'asc' },
  })
  const results = rows.filter((r): r is ExportResult & { racer: ExportRacer } => r.racer !== null)
  const started = race.startedAt !== null

  return {
    id: race.id,
    name: race.name ?? `Utrka ${race.id}`,
    raceType: (RACE_TYPES[race.raceType ?? -1] as RaceType | undefined) ?? null,
    uciDisplay: race.uciDisplay ?? false,
    started,
    results,
    byCategory: race.categories
      .map((category) => ({
        name: category.name ?? '',
        results: sortResults(
          results.filter((r) => r.categoryId === category.id),
          started,
        ),
      }))
      .filter((group) => group.results.length > 0),
  }
}

// Formatting helpers mirroring the Rails `Racer` / `RaceResult` methods used by the exports.

export const lastName = (racer: ExportRacer) => (racer.lastName ?? '').trim().toLocaleUpperCase('hr')

export const firstName = (racer: ExportRacer) => (racer.firstName ?? '').trim()

/** Rails `Racer#club_name(is_uci)`: racers with a one-day licence ride as "Individual" in UCI races. */
export function clubName(racer: ExportRacer, uci = false): string {
  if (uci && racer.uciId === NO_UCI_ID) return 'Individual'
  return racer.club?.name ?? ''
}

export function birthDate(racer: ExportRacer): string {
  const { dayOfBirth: d, monthOfBirth: m, yearOfBirth: y } = racer
  if (!y) return ''
  if (!d || !m) return String(y)
  return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`
}

export function fullAddress(racer: ExportRacer): string {
  return [racer.address, racer.zipCode, racer.town, countryName(racer.country)]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
}

export const genderLabel = (racer: ExportRacer) =>
  racer.gender === GENDER.female ? 'Ženski' : racer.gender === GENDER.male ? 'Muški' : ''

export const nat = (racer: ExportRacer) => iocCode(racer.country)

/** `%k` in the Rails time format pads hours with a space. */
export const cleanTime = (value: string | null) => value?.trim() ?? ''

function lapWord(race: ExportRace, count: number) {
  if (race.raceType === 'treking') return 'KT'
  if (count === 1) return 'krug'
  return count >= 2 && count <= 4 ? 'kruga' : 'krugova'
}

/** Rails `RaceResult#pretty_status`. */
export function prettyStatus(race: ExportRace, result: ExportResult & { racer: ExportRacer }): string {
  const male = result.racer.gender === GENDER.male
  switch (result.status) {
    case RESULT_STATUS.registered:
      return male ? 'Prijavljen' : 'Prijavljena'
    case RESULT_STATUS.atStart:
      return 'Na startu'
    case RESULT_STATUS.finished: {
      const ended = male ? 'Završio' : 'Završila'
      if (race.raceType !== 'xco') return ended
      const laps = Array.isArray(result.lapTimes) ? result.lapTimes.length : 0
      return `${ended} ${laps} ${lapWord(race, laps)}`
    }
    case RESULT_STATUS.dnf:
      return 'DNF'
    case RESULT_STATUS.dsq:
      return 'DSQ'
    case RESULT_STATUS.dns:
      return 'DNS'
    default:
      return 'Nepoznat'
  }
}
