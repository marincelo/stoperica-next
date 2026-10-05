/** Elapsed race time as `h:mm:ss.mmm`. Hours are not wrapped at 24. */

const CLOCK = /^(-)?(\d+):([0-5]\d):([0-5]\d)(?:[.,](\d{1,3}))?$/

export function formatLapClock(elapsedMs: number): string {
  const sign = elapsedMs < 0 ? '-' : ''
  const ms = Math.abs(Math.round(elapsedMs))
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor(ms / 60_000) % 60
  const s = Math.floor(ms / 1_000) % 60
  const milli = ms % 1000
  return `${sign}${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(milli).padStart(3, '0')}`
}

/** Parse `h:mm:ss.mmm`. Missing fraction is `.000`. Returns elapsed milliseconds. */
export function parseLapClock(value: string): number | null {
  const match = CLOCK.exec(value.trim())
  if (!match) return null
  const sign = match[1] ? -1 : 1
  const hours = Number(match[2])
  const minutes = Number(match[3])
  const seconds = Number(match[4])
  const fraction = (match[5] ?? '').padEnd(3, '0')
  const millis = fraction.length === 0 ? 0 : Number(fraction)
  return sign * (((hours * 60 + minutes) * 60 + seconds) * 1000 + millis)
}

/** Unix seconds of a stored lap, shown as elapsed time from `startAt`. */
export function lapUnixToClock(unixSeconds: number, startAt: string): string {
  return formatLapClock(Math.round(unixSeconds * 1000) - Date.parse(startAt))
}

/**
 * Elapsed clock plus the start instant. Returns Unix seconds, matching `lap_times.time`.
 * `null` when the clock or the start instant cannot be read.
 */
export function clockToLapUnix(clock: string, startAt: string): number | null {
  const elapsedMs = parseLapClock(clock)
  const startMs = Date.parse(startAt)
  if (elapsedMs === null || !Number.isFinite(startMs)) return null
  return (startMs + elapsedMs) / 1000
}
