import type { ClubOption, RacerProfile } from '@stoperica/shared'
import type { FastifyPluginAsync } from 'fastify'
import { isPhoneTaken } from '../auth/credentials.js'
import { profileSchema, toProfile, toRacerData } from '../auth/profile.js'
import { prisma } from '../db.js'
import { HttpError } from '../lib/errors.js'

const profileSelect = {
  firstName: true,
  lastName: true,
  email: true,
  phoneNumber: true,
  gender: true,
  dayOfBirth: true,
  monthOfBirth: true,
  yearOfBirth: true,
  clubId: true,
  address: true,
  zipCode: true,
  town: true,
  country: true,
  shirtSize: true,
  uciId: true,
} as const

export const meRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', app.authenticate)

  app.get('/profile', async (request) => {
    const racer = await prisma.racer.findUniqueOrThrow({ where: { id: request.session!.id }, select: profileSelect })
    return toProfile(racer)
  })

  app.put<{ Body: RacerProfile }>('/profile', { schema: { body: profileSchema } }, async (request) => {
    const id = request.session!.id
    const email = request.body.email.trim()
    const current = await prisma.racer.findUniqueOrThrow({ where: { id }, select: { email: true } })
    // Some families share one email (legacy data), so only check uniqueness when it changes.
    if (email.toLowerCase() !== current.email?.trim().toLowerCase()) {
      const emailTaken = await prisma.racer.findFirst({
        where: { id: { not: id }, email: { equals: email, mode: 'insensitive' } },
        select: { id: true },
      })
      if (emailTaken) throw new HttpError(409, 'Taj e-mail već koristi drugi natjecatelj')
    }
    if (await isPhoneTaken(request.body.phoneNumber, id)) {
      throw new HttpError(409, 'Taj broj telefona već koristi drugi natjecatelj')
    }

    const racer = await prisma.racer.update({
      where: { id },
      data: await toRacerData(request.body),
      select: profileSelect,
    })
    return toProfile(racer)
  })
}

export const clubRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (): Promise<ClubOption[]> => {
    const clubs = await prisma.club.findMany({
      where: { name: { not: null } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    return clubs.map((club) => ({ id: club.id, name: club.name! }))
  })
}
