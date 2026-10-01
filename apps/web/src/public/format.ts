import type { LeagueType, RaceType } from '@stoperica/shared'

export const LEAGUE_TYPE_LABELS: Record<LeagueType, string> = {
  xczld: 'XCZLD',
  lead: 'Sportsko penjanje',
  running: 'Trčanje',
  trail: 'Trail',
  stage_competitors_only: 'Etapna utrka',
}

/** Legacy picture URLs sometimes point to files that no longer exist. */
export const hideBrokenImage = (event: Event) => {
  ;(event.target as HTMLImageElement).style.visibility = 'hidden'
}

/** Croatian plural form: 1 utrka, 2 utrke, 5 utrka. */
export function plural(count: number, one: string, few: string, many: string): string {
  const last = count % 10
  const lastTwo = count % 100
  if (last === 1 && lastTwo !== 11) return one
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return few
  return many
}

export const MEDAL_COLORS = ['#f5c542', '#c0c6cf', '#cd7f32'] as const

export const RACE_TYPE_LABELS: Record<RaceType, string> = {
  mtb: 'MTB',
  trcanje: 'Trčanje',
  treking: 'Treking',
  duatlon: 'Duatlon',
  triatlon: 'Triatlon',
  penjanje: 'Penjanje',
  xco: 'XCO',
  road: 'Cestovni',
}

const FEMALE = 1

/** Port of Rails `RaceResult#pretty_status`, without the XCO lap count (laps are shown as splits). */
export function statusLabel(result: { status: number | null; racer: { gender: number | null } }): string {
  const female = result.racer.gender === FEMALE
  switch (result.status) {
    case 1:
      return female ? 'Prijavljena' : 'Prijavljen'
    case 2:
      return 'Na startu'
    case 3:
      return female ? 'Završila' : 'Završio'
    case 4:
      return 'DNF'
    case 5:
      return 'DSQ'
    case 6:
      return 'DNS'
    default:
      return 'Nepoznat'
  }
}

export function statusType(status: number | null): 'default' | 'info' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 2:
      return 'info'
    case 3:
      return 'success'
    case 4:
    case 6:
      return 'warning'
    case 5:
      return 'error'
    default:
      return 'default'
  }
}

const dateFormatter = new Intl.DateTimeFormat('hr-HR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Zagreb' })
const shortDateFormatter = new Intl.DateTimeFormat('hr-HR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Zagreb' })

export const formatDateTime = (value: string | null) => (value ? dateFormatter.format(new Date(value)) : '—')
export const formatDate = (value: string | null) => (value ? shortDateFormatter.format(new Date(value)) : '—')

export const formatElapsed = (startedAt: string, now = Date.now()): string => {
  const s = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** Stored times look like " 0:51:03"; missing ones are "- -". */
export const cleanTime = (value: string | null) => {
  const trimmed = value?.trim()
  return trimmed && trimmed !== '- -' ? trimmed : '—'
}

const regionNames = new Intl.DisplayNames(['hr'], { type: 'region' })

export function countryName(code: string | null): string {
  if (!code) return ''
  try {
    return regionNames.of(code) ?? code
  } catch {
    return code
  }
}

export function countryFlag(code: string | null): string {
  if (!code || !/^[A-Z]{2}$/.test(code)) return ''
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}

export const racerName = (racer: { firstName: string | null; lastName: string | null }) =>
  [racer.firstName, racer.lastName].filter(Boolean).join(' ') || '—'

/** UCI style used in Rails results for UCI races: "LASTNAME Firstname". */
export const uciRacerName = (racer: { firstName: string | null; lastName: string | null }) =>
  [racer.lastName?.toLocaleUpperCase('hr-HR'), racer.firstName].filter(Boolean).join(' ') || '—'
