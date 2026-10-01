import { formatDuration } from '../public/splits.js'

/** Rails `strftime('%k:%M:%S')` — hour is space-padded (` 1:13:56`). */
function formatRailsDuration(seconds: number, millis: boolean): string {
  return formatDuration(seconds, millis).replace(/^(\d):/, ' $1:')
}

/** One `lap_times` row as stored in Rails JSON. */
export interface LapRecord {
  time: number
  reader_id: string
}

function asArray(raw: unknown): unknown[] {
  return Array.isArray(raw) ? raw : []
}

function entryTime(entry: unknown): number | null {
  if (typeof entry === 'number' && Number.isFinite(entry)) return entry
  if (entry && typeof entry === 'object' && 'time' in entry) {
    const seconds = Number((entry as { time: unknown }).time)
    return Number.isFinite(seconds) ? seconds : null
  }
  return null
}

function entryReaderId(entry: unknown): string {
  if (entry && typeof entry === 'object' && 'reader_id' in entry) {
    return String((entry as { reader_id: unknown }).reader_id ?? '')
  }
  return '0'
}

/** Rails `insert_lap_time`: XCO always appends; other types replace the same reader. */
export function insertLapTime(raw: unknown, time: number, readerId: string, xco: boolean): LapRecord[] {
  const laps = asArray(raw).map((entry) =>
    entry && typeof entry === 'object' ? { ...(entry as object) } : entry,
  )
  if (xco) {
    laps.push({ time, reader_id: readerId })
  } else {
    const index = laps.findIndex((entry) => entryReaderId(entry) === String(readerId))
    if (index >= 0) {
      const current = laps[index]
      laps[index] =
        current && typeof current === 'object'
          ? { ...current, time, reader_id: entryReaderId(current) }
          : { time, reader_id: readerId }
    } else {
      laps.push({ time, reader_id: readerId })
    }
  }
  return laps as LapRecord[]
}

function controlPointMillis(laps: unknown[], readerId: string | null): number | null {
  const entry =
    readerId === null
      ? laps.at(-1)
      : laps.find((it) => entryReaderId(it) === String(readerId))
  return entryTime(entry)
}

/** Rails `lap_millis`. Position is 1-based. */
function lapMillis(laps: unknown[], position: number | null, xco: boolean): number | null {
  if (!laps.length) return null
  if (xco && position === null) return controlPointMillis(laps, null)
  if (position === null) return controlPointMillis(laps, '0') ?? controlPointMillis(laps, null)
  return entryTime(laps[position - 1])
}

export function lapClock(args: {
  laps: unknown
  position: number | null
  status: number | null
  startedAt: Date | null
  raceStartedAt: Date | null
  millisDisplay: boolean
  xco: boolean
}): string {
  const laps = asArray(args.laps)
  const epoch = lapMillis(laps, args.position, args.xco)
  if (epoch === null || args.status !== 3) return '- -'
  const start = args.startedAt ?? args.raceStartedAt
  if (!start) return '- -'
  return formatRailsDuration(epoch - start.getTime() / 1000, args.millisDisplay)
}

/** Rails `live_time[:time]` — clock at the last reader's most recent hit. */
export function liveFinishTime(args: {
  laps: unknown
  status: number | null
  startedAt: Date | null
  raceStartedAt: Date | null
  millisDisplay: boolean
  xco: boolean
}): string {
  const laps = asArray(args.laps)
  if (!laps.length) return '- -'
  const last = laps.at(-1)
  const index = laps.findLastIndex((entry) => entryReaderId(entry) === entryReaderId(last))
  if (index < 0) return '- -'
  return lapClock({ ...args, position: index + 1 })
}
