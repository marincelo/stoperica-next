import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../db.js'
import { HttpError } from '../lib/errors.js'

const params = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'integer', minimum: 1 } },
} as const

const body = {
  type: 'object',
  required: ['clubIds'],
  additionalProperties: false,
  properties: {
    clubIds: { type: 'array', items: { type: 'integer', minimum: 1 } },
  },
} as const

async function leagueOrThrow(id: number) {
  const league = await prisma.league.findUnique({ where: { id: BigInt(id) }, select: { id: true } })
  if (!league) throw new HttpError(404, 'Natjecanje nije pronađeno')
  return league.id
}

/** Participating clubs are the `club_league_points` rows for the league. */
export const leagueClubRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { id: number } }>('/:id/clubs', { schema: { params } }, async (request) => {
    const leagueId = await leagueOrThrow(request.params.id)
    const rows = await prisma.clubLeaguePoint.findMany({
      where: { leagueId, clubId: { not: null } },
      select: { clubId: true },
      orderBy: { club: { name: 'asc' } },
    })
    return { clubIds: [...new Set(rows.map((row) => row.clubId!))] }
  })

  app.put<{ Params: { id: number }; Body: { clubIds: number[] } }>(
    '/:id/clubs',
    { schema: { params, body } },
    async (request) => {
      const leagueId = await leagueOrThrow(request.params.id)
      const clubIds = [...new Set(request.body.clubIds)]
      if (clubIds.length) {
        const found = await prisma.club.count({ where: { id: { in: clubIds } } })
        if (found !== clubIds.length) throw new HttpError(400, 'Nepoznat klub')
      }

      const existing = await prisma.clubLeaguePoint.findMany({
        where: { leagueId },
        select: { id: true, clubId: true },
      })
      const present = new Set(existing.flatMap((row) => (row.clubId == null ? [] : [row.clubId])))
      const wanted = new Set(clubIds)
      const remove = existing.filter((row) => row.clubId == null || !wanted.has(row.clubId)).map((row) => row.id)
      const add = clubIds.filter((clubId) => !present.has(clubId))

      await prisma.$transaction(async (tx) => {
        if (remove.length) await tx.clubLeaguePoint.deleteMany({ where: { id: { in: remove } } })
        if (add.length) {
          await tx.clubLeaguePoint.createMany({
            data: add.map((clubId) => ({
              clubId,
              leagueId,
              points: {},
              total: 0,
              createdAt: new Date(),
            })),
          })
        }
      })

      return { clubIds }
    },
  )
}
