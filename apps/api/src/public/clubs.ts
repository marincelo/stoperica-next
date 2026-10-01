import type { ClubOption, PublicClubProfile } from '@stoperica/shared'
import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../db.js'
import { HttpError } from '../lib/errors.js'

export const clubRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (): Promise<ClubOption[]> => {
    const clubs = await prisma.club.findMany({
      where: { name: { not: null } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    return clubs.map((club) => ({ id: club.id, name: club.name! }))
  })

  app.get<{ Params: { id: string } }>('/:id', async (request) => {
    const id = Number(request.params.id)
    if (!Number.isInteger(id) || id < 1) throw new HttpError(404, 'Klub nije pronađen')

    const club = await prisma.club.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        racers: {
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
          select: { id: true, firstName: true, lastName: true, country: true },
        },
      },
    })
    if (!club) throw new HttpError(404, 'Klub nije pronađen')

    const body: PublicClubProfile = {
      id: club.id,
      name: club.name,
      members: club.racers,
    }
    return body
  })
}
