import type { PublicSplit, RaceType } from '@stoperica/shared'

// Port of the Rails `RaceResult` lap/control point helpers (lap_time, lap_diff,
// control_point_time, control_point_diff). `lap_times` entries are
// `{ time: <epoch seconds>, reader_id }` or bare epoch seconds (old data).

type LapEntry = { time: number; readerId: string }

const TRIATHLON_SPLIT_NAMES = ['Plivanje', 'T1 + Bicikl', 'T2 + Trčanje']

function parseLapTimes(raw: unknown): LapEntry[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((entry) => {
    if (typeof entry === 'number') return [{ time: entry, readerId: '0' }]
    if (entry && typeof entry === 'object') {
      const { time, reader_id } = entry as { time?: unknown; reader_id?: unknown }
      const seconds = Number(time)
      if (Number.isFinite(seconds)) return [{ time: seconds, readerId: String(reader_id ?? '0') }]
    }
    return []
  })
}

/** Rails `strftime('%k:%M:%S')` / `'%k:%M:%S.%2N'` of a duration. */
export function formatDuration(seconds: number, millis: boolean): string {
  const totalCentis = Math.max(0, Math.floor(seconds * 100))
  const h = Math.floor(totalCentis / 360000) % 24
  const m = Math.floor(totalCentis / 6000) % 60
  const s = Math.floor(totalCentis / 100) % 60
  const base = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return millis ? `${base}.${String(totalCentis % 100).padStart(2, '0')}` : base
}

export interface SplitInput {
  raceType: RaceType | null
  millisDisplay: boolean
  raceStartedAt: Date | null
  controlPoints: unknown[]
  result: { status: number | null; startedAt: Date | null; lapTimes: unknown }
}

export function computeSplits({ raceType, millisDisplay, raceStartedAt, controlPoints, result }: SplitInput): PublicSplit[] {
  const start = (result.startedAt ?? raceStartedAt)?.getTime()
  if (result.status !== 3 || start === undefined) return []
  const laps = parseLapTimes(result.lapTimes)
  if (!laps.length) return []

  const sinceStart = (time: number) => formatDuration(time - start / 1000, millisDisplay)
  const diff = (a: number, b: number) => formatDuration(a - b, millisDisplay)

  if (raceType === 'xco') {
    return laps.map((lap, i) => ({
      label: `LAP ${i + 1}`,
      time: sinceStart(lap.time),
      split: i > 0 ? diff(lap.time, laps[i - 1]!.time) : null,
      missed: false,
    }))
  }

  if ((raceType === 'treking' || raceType === 'triatlon') && controlPoints.length) {
    const readerIds = controlPoints.map((cp) => String((cp as { reader_id?: unknown })?.reader_id ?? ''))
    const lastAt = (readerId: string) => [...laps].reverse().find((l) => l.readerId === readerId)?.time
    const firstAt = (readerId: string) => laps.find((l) => l.readerId === readerId)?.time

    return readerIds.map((readerId, i) => {
      const time = lastAt(readerId)
      const current = firstAt(readerId)
      const previous = i > 0 ? firstAt(readerIds[i - 1]!) : undefined
      const split = current !== undefined && previous !== undefined ? diff(current, previous) : null
      if (raceType === 'triatlon') {
        return {
          label: TRIATHLON_SPLIT_NAMES[i] ?? `KT ${i + 1}`,
          time: i === 0 && time !== undefined ? sinceStart(time) : split,
          split: null,
          missed: time === undefined,
        }
      }
      return {
        label: `KT ${i + 1}`,
        time: time !== undefined ? sinceStart(time) : null,
        split,
        missed: time === undefined,
      }
    })
  }

  return []
}
