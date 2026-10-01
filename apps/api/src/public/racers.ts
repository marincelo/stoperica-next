import type { PublicRacerProfile } from '@stoperica/shared'
import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../db.js'
import { HttpError } from '../lib/errors.js'

export const publicRacerRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { id: string } }>('/:id', async (request) => {
    const id = Number(request.params.id)
    if (!Number.isInteger(id) || id < 1) throw new HttpError(404, 'Natjecatelj nije pronađen')

    const racer = await prisma.racer.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        country: true,
        club: { select: { name: true } },
        raceResults: {
          orderBy: { id: 'desc' },
          select: {
            id: true,
            position: true,
            status: true,
            finishTime: true,
            category: { select: { name: true } },
            race: { select: { id: true, name: true } },
          },
        },
      },
    })
    if (!racer) throw new HttpError(404, 'Natjecatelj nije pronađen')

    const body: PublicRacerProfile = {
      id: racer.id,
      firstName: racer.firstName,
      lastName: racer.lastName,
      country: racer.country,
      club: racer.club?.name ?? null,
      results: racer.raceResults.flatMap((row) =>
        row.race
          ? [
              {
                id: row.id,
                position: row.position,
                status: row.status,
                finishTime: row.finishTime,
                categoryName: row.category?.name ?? null,
                race: row.race,
              },
            ]
          : [],
      ),
    }
    return body
  })
}
