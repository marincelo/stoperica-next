import type { LeagueType, RaceType } from '@stoperica/shared'
import { CATEGORIES } from '../public/enums.js'
import { finishEpoch } from './laps.js'

/**
 * Rails `Race#assign_positions`, `RaceResult#calc_finish_delta`, `Race#assign_points`
 * and (for road) `Race#adjust_finish_time`. One pass, using the ranking this call
 * just produced as the category leader.
 */

const XCZLD_POINTS = [
  250, 200, 160, 150, 140, 130, 120, 110, 100, 90, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10,
]
const TRAIL_POINTS = [
  100, 88, 78, 72, 68, 66, 64, 62, 60, 58, 56, 54, 52, 50, 48, 46, 44, 42, 40, 38, 36, 34, 32, 30, 28, 26, 24, 22,
  20, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
]

const EBIKE = new Set([CATEGORIES.indexOf('ebikem'), CATEGORIES.indexOf('ebikez')])
const SAME_TIME_SECONDS = 1.1

export interface RefreshResultInput {
  id: number
  categoryId: number | null
  status: number | null
  position: number | null
  points: number | null
  additionalPoints: number | null
  finishTime: string | null
  finishDelta: string | null
  missedControlPoints: number | null
  lapTimes: unknown
  startedAt: Date | null
  gender: number | null
  clubId: number | null
}

export interface RefreshCategoryInput {
  id: number
  /** Rails `Category.category` enum index. */
  kind: number | null
}

export interface ClubPointsInput {
  id: bigint
  clubId: number | null
  points: unknown
}

export interface RefreshInput {
  raceId: number
  raceType: RaceType | null
  millisDisplay: boolean
  startedAt: Date | null
  pointsMultiplier: number | null
  leagueType: LeagueType | null
  categories: RefreshCategoryInput[]
  results: RefreshResultInput[]
  clubPoints: ClubPointsInput[]
}

export interface ResultUpdate {
  id: number
  position?: number
  finishTime?: string
  finishDelta?: string
  points?: number | null
  additionalPoints?: number | null
}

export interface ClubPointsUpdate {
  id: bigint
  points: Record<string, number>
  total: number
}

interface Row extends RefreshResultInput {
  categoryKind: number | null
}

/** Rails `Time.at(seconds).utc.strftime('%k:%M:%S')`, optionally with centiseconds. */
export function formatRubyDuration(seconds: number, millis: boolean): string {
  if (!Number.isFinite(seconds)) return '- -'
  const date = new Date(Math.trunc(seconds * 1000))
  if (Number.isNaN(date.getTime())) return '- -'
  const hour = date.getUTCHours()
  const hh = hour < 10 ? ` ${hour}` : String(hour)
  const base = `${hh}:${String(date.getUTCMinutes()).padStart(2, '0')}:${String(date.getUTCSeconds()).padStart(2, '0')}`
  if (!millis) return base
  return `${base}.${String(Math.floor(date.getUTCMilliseconds() / 10)).padStart(2, '0')}`
}

function lapCount(laps: unknown): number {
  return Array.isArray(laps) ? laps.length : 0
}

/** Rails `RaceResult#lap_text`. Treking always says KT; 2–4 is "kruga". */
function lapText(count: number, treking: boolean): string {
  if (treking) return 'KT'
  if (count === 1) return 'krug'
  if (count >= 2 && count <= 4) return 'kruga'
  return 'krugova'
}

function elapsedSeconds(row: Row, raceStartedAt: Date | null, xco: boolean): number | null {
  const epoch = finishEpoch(row.lapTimes, xco)
  if (epoch === null) return null
  const start = row.startedAt ?? raceStartedAt
  if (!start) return null
  return epoch - start.getTime() / 1000
}

/** Rails `lap_time`: the sort key and the stored finish clock. */
function lapTime(row: Row, raceStartedAt: Date | null, xco: boolean, millis: boolean): string {
  if (row.status !== 3) return '- -'
  const elapsed = elapsedSeconds(row, raceStartedAt, xco)
  if (elapsed === null) return '- -'
  return formatRubyDuration(elapsed, millis)
}

function byId(a: { id: number }, b: { id: number }) {
  return a.id - b.id
}

function assignPositions(rows: Row[], categories: RefreshCategoryInput[], raceStartedAt: Date | null, xco: boolean, treking: boolean, millis: boolean) {
  for (const category of categories) {
    const ranked = rows
      .filter((row) => row.categoryId === category.id && row.status === 3 && lapCount(row.lapTimes) > 0)
      .sort((a, b) => {
        const missed = (a.missedControlPoints ?? 0) - (b.missedControlPoints ?? 0)
        if (missed) return missed
        const laps = lapCount(b.lapTimes) - lapCount(a.lapTimes)
        if (laps) return laps
        const left = lapTime(a, raceStartedAt, xco, millis)
        const right = lapTime(b, raceStartedAt, xco, millis)
        if (left !== right) return left < right ? -1 : 1
        return byId(a, b)
      })

    ranked.forEach((row, index) => {
      row.position = index + 1
      row.finishTime = lapTime(row, raceStartedAt, xco, millis)
    })

    const leader = ranked[0]
    if (!leader) continue
    const leaderEpoch = finishEpoch(leader.lapTimes, xco)
    const leaderLaps = lapCount(leader.lapTimes)
    for (const row of ranked) {
      row.finishDelta = finishDelta(row, leader, leaderEpoch, leaderLaps, xco, treking, millis)
    }
  }
}

function finishDelta(
  row: Row,
  leader: Row,
  leaderEpoch: number | null,
  leaderLaps: number,
  xco: boolean,
  treking: boolean,
  millis: boolean,
): string {
  if (row.status !== 3) return '- -'
  const missed = row.missedControlPoints ?? 0
  if (missed !== 0) return `- ${missed} ${lapText(missed, treking)}`
  if (lapCount(row.lapTimes) === 0) return '- -'
  const behind = leaderLaps - lapCount(row.lapTimes)
  if (behind !== 0) return `- ${behind} ${lapText(behind, treking)}`
  const epoch = finishEpoch(row.lapTimes, xco)
  if (epoch === null || leaderEpoch === null) return '- -'
  return `+${formatRubyDuration(epoch - leaderEpoch, millis)}`
}

/**
 * Consecutive finishers within 1.1s share a time.
 * Rails subtracts previous minus current, which is negative for every slower
 * rider and would copy the winner's clock down the classification.
 */
function adjustRoadTimes(rows: Row[], xco: boolean) {
  const placed = rows
    .filter((row) => row.status === 3)
    .sort((a, b) => (a.position ?? Number.POSITIVE_INFINITY) - (b.position ?? Number.POSITIVE_INFINITY) || byId(a, b))
  for (let index = 1; index < placed.length; index++) {
    const prev = placed[index - 1]!
    const current = placed[index]!
    const prevEpoch = finishEpoch(prev.lapTimes, xco)
    const epoch = finishEpoch(current.lapTimes, xco)
    if (prevEpoch === null || epoch === null) continue
    if (Math.abs(prevEpoch - epoch) < SAME_TIME_SECONDS) {
      current.finishTime = prev.finishTime
      current.finishDelta = prev.finishDelta
    }
  }
}

function placedInCategory(rows: Row[], categoryId: number): Row[] {
  return rows
    .filter((row) => row.categoryId === categoryId && row.status === 3)
    .sort((a, b) => (a.position ?? Number.POSITIVE_INFINITY) - (b.position ?? Number.POSITIVE_INFINITY) || byId(a, b))
}

function assignLeaguePoints(rows: Row[], categories: RefreshCategoryInput[], table: number[], limit: number | null, multiplier: number, fallback: number) {
  for (const row of rows) row.points = null
  for (const category of categories) {
    const placed = placedInCategory(rows, category.id)
    const scored = limit === null ? placed : placed.slice(0, limit)
    scored.forEach((row, index) => {
      row.points = (table[index] ?? fallback) * multiplier
    })
  }
}

function compareFinishDesc(a: string | null, b: string | null): number {
  if (a === b) return 0
  if (a === null) return -1
  if (b === null) return 1
  return a < b ? 1 : -1
}

function assignRunningPoints(rows: Row[], categories: RefreshCategoryInput[]) {
  const finishers = rows.filter((row) => row.status === 3)
  const byTime = (gender: number) =>
    finishers
      .filter((row) => row.gender === gender)
      .sort((a, b) => compareFinishDesc(a.finishTime, b.finishTime) || byId(a, b))
  for (const gender of [2, 1]) {
    byTime(gender).forEach((row, index) => {
      row.additionalPoints = index + 1
    })
  }
  for (const category of categories) {
    placedInCategory(rows, category.id)
      .sort((a, b) => compareFinishDesc(a.finishTime, b.finishTime) || byId(a, b))
      .forEach((row, index) => {
        row.points = index + 1
      })
  }
}

function pointsInRace(rows: Row[], clubId: number): number {
  return rows.reduce((sum, row) => {
    if (row.clubId !== clubId || EBIKE.has(row.categoryKind ?? -1)) return sum
    return sum + (row.points ?? 0) + (row.additionalPoints ?? 0)
  }, 0)
}

function pointMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: Record<string, number> = {}
  for (const [key, raw] of Object.entries(value)) {
    const number = typeof raw === 'number' ? raw : Number(raw)
    if (Number.isFinite(number)) out[key] = number
  }
  return out
}

function sameMap(a: Record<string, number>, b: Record<string, number>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const key of keys) if (a[key] !== b[key]) return false
  return true
}

function writeClubPoints(clubs: ClubPointsInput[], raceId: number, valueFor: (clubId: number) => number | null): ClubPointsUpdate[] {
  const updates: ClubPointsUpdate[] = []
  for (const club of clubs) {
    if (club.clubId === null) continue
    const value = valueFor(club.clubId)
    if (value === null) continue
    const current = pointMap(club.points)
    const next = { ...current, [String(raceId)]: value }
    const total = Math.round(Object.values(next).reduce((sum, item) => sum + item, 0))
    if (sameMap(current, next)) continue
    updates.push({ id: club.id, points: next, total })
  }
  return updates
}

function clubUpdates(rows: Row[], input: RefreshInput): ClubPointsUpdate[] {
  const { leagueType, raceId, clubPoints } = input
  if (!leagueType || clubPoints.length === 0) return []

  if (leagueType === 'xczld') {
    const ranked = clubPoints
      .filter((club) => club.clubId !== null && pointsInRace(rows, club.clubId!) !== 0)
      .sort((a, b) => pointsInRace(rows, a.clubId!) - pointsInRace(rows, b.clubId!) || a.clubId! - b.clubId!)
    const rank = new Map(ranked.map((club, index) => [club.clubId!, index + 1]))
    return writeClubPoints(ranked, raceId, (clubId) => rank.get(clubId) ?? null)
  }

  if (leagueType === 'lead') {
    return writeClubPoints(clubPoints, raceId, (clubId) => {
      let sum = 0
      for (const category of input.categories) {
        const top = rows
          .filter((row) => row.categoryId === category.id && row.clubId === clubId)
          .sort((a, b) => (a.position ?? Number.POSITIVE_INFINITY) - (b.position ?? Number.POSITIVE_INFINITY) || byId(a, b))
          .slice(0, 5)
        for (const row of top) if (row.points !== null) sum += row.points
      }
      return sum
    })
  }

  if (leagueType === 'running') {
    return writeClubPoints(clubPoints, raceId, (clubId) => pointsInRace(rows, clubId))
  }

  return []
}

function resultUpdates(before: RefreshResultInput[], after: Row[]): ResultUpdate[] {
  const updates: ResultUpdate[] = []
  for (const next of after) {
    const prev = before.find((row) => row.id === next.id)
    if (!prev) continue
    const update: ResultUpdate = { id: next.id }
    let changed = false
    if (next.position !== prev.position && next.position !== null) {
      update.position = next.position
      changed = true
    }
    if (next.finishTime !== prev.finishTime && next.finishTime !== null) {
      update.finishTime = next.finishTime
      changed = true
    }
    if (next.finishDelta !== prev.finishDelta && next.finishDelta !== null) {
      update.finishDelta = next.finishDelta
      changed = true
    }
    if (next.points !== prev.points) {
      update.points = next.points
      changed = true
    }
    if (next.additionalPoints !== prev.additionalPoints) {
      update.additionalPoints = next.additionalPoints
      changed = true
    }
    if (changed) updates.push(update)
  }
  return updates
}

export function planRefresh(input: RefreshInput): { results: ResultUpdate[]; clubPoints: ClubPointsUpdate[] } {
  const kinds = new Map(input.categories.map((category) => [category.id, category.kind]))
  const rows: Row[] = input.results.map((row) => ({
    ...row,
    categoryKind: row.categoryId === null ? null : (kinds.get(row.categoryId) ?? null),
  }))
  const xco = input.raceType === 'xco'
  const treking = input.raceType === 'treking'
  const multiplier = input.pointsMultiplier ?? 1

  if (input.leagueType !== 'lead') {
    assignPositions(rows, input.categories, input.startedAt, xco, treking, input.millisDisplay)
    if (input.leagueType === 'xczld') assignLeaguePoints(rows, input.categories, XCZLD_POINTS, 25, multiplier, 0)
    else if (input.leagueType === 'trail') assignLeaguePoints(rows, input.categories, TRAIL_POINTS, null, multiplier, 1)
    else if (input.leagueType === 'running') assignRunningPoints(rows, input.categories)
    if (input.raceType === 'road') adjustRoadTimes(rows, xco)
  }

  return { results: resultUpdates(input.results, rows), clubPoints: clubUpdates(rows, input) }
}
