import { prisma } from '../db.js'
import { racePageCache } from './raceCache.js'

const categoryRaceIds = new Map<number, number | null>()
const startNumberRaceIds = new Map<number, Set<number>>()

async function racesUsingStartNumber(id: number): Promise<Set<number>> {
  const [number, results] = await Promise.all([
    prisma.startNumber.findUnique({ where: { id }, select: { raceId: true } }),
    prisma.raceResult.findMany({
      where: { startNumberId: id, raceId: { not: null } },
      select: { raceId: true },
      distinct: ['raceId'],
    }),
  ])
  const ids = new Set<number>()
  if (number?.raceId) ids.add(number.raceId)
  for (const row of results) if (row.raceId) ids.add(row.raceId)
  return ids
}

/** Remember the race before a category update or delete, so the previous page can be dropped too. */
export async function rememberCategoryRace(id: number) {
  const row = await prisma.category.findUnique({ where: { id }, select: { raceId: true } })
  categoryRaceIds.set(id, row?.raceId ?? null)
}

export async function invalidateCategoryRace(id: number) {
  const previous = categoryRaceIds.get(id)
  categoryRaceIds.delete(id)
  const row = await prisma.category.findUnique({ where: { id }, select: { raceId: true } })
  if (previous) racePageCache.invalidate(previous)
  if (row?.raceId) racePageCache.invalidate(row.raceId)
}

/** Remember every race showing this bib before it is edited or deleted. */
export async function rememberStartNumberRaces(id: number) {
  startNumberRaceIds.set(id, await racesUsingStartNumber(id))
}

export async function invalidateStartNumberRaces(id: number) {
  const previous = startNumberRaceIds.get(id) ?? new Set<number>()
  startNumberRaceIds.delete(id)
  const current = await racesUsingStartNumber(id)
  for (const raceId of previous) racePageCache.invalidate(raceId)
  for (const raceId of current) racePageCache.invalidate(raceId)
}
