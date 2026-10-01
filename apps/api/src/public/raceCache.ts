import type { LiveRace, MyRegistration, PublicCategory, PublicRaceDetail } from '@stoperica/shared'

/**
 * Public race page without the fields that change per visitor or as the clock
 * passes the registration deadline. Built on first read and kept until a write
 * in this process calls `invalidate`.
 */
export type CachedRacePage = Omit<PublicRaceDetail, 'myRegistration' | 'registrationOpen' | 'cancellationAllowed'> & {
  lockRaceResults: boolean
}

export interface RacePageCache {
  get(raceId: number): CachedRacePage | undefined
  set(raceId: number, page: CachedRacePage): void
  invalidate(raceId: number): void
}

const pages = new Map<number, CachedRacePage>()

/** Single slot: `undefined` is a miss, `{ payload: null }` is a known idle board. */
let live: { payload: LiveRace | null } | undefined

export const liveRaceCache = {
  get: () => live,
  set: (payload: LiveRace | null) => {
    live = { payload }
  },
  invalidate: () => {
    live = undefined
  },
}

export const racePageCache: RacePageCache = {
  get: (raceId) => pages.get(raceId),
  set: (raceId, page) => {
    pages.set(raceId, page)
  },
  invalidate: (raceId) => {
    pages.delete(raceId)
    // Live board is one slot; drop it on any race-page write so start/stop and laps stay fresh.
    liveRaceCache.invalidate()
  },
}

function findMine(categories: PublicCategory[], sessionId: number): MyRegistration | null {
  for (const category of categories) {
    const row = category.results.find((result) => result.racer.id === sessionId)
    if (row) return { id: row.id, categoryId: category.id, status: row.status }
  }
  return null
}

/** Recomputes deadline-based fields and attaches the visitor's own registration. */
export function presentRacePage(cached: CachedRacePage, sessionId: number | undefined): PublicRaceDetail {
  const { lockRaceResults, ...page } = cached
  const registrationOpen =
    page.registrationThreshold !== null && Date.now() < new Date(page.registrationThreshold).getTime()
  return {
    ...page,
    registrationOpen,
    cancellationAllowed: registrationOpen && !lockRaceResults,
    myRegistration: sessionId ? findMine(page.categories, sessionId) : null,
  }
}
