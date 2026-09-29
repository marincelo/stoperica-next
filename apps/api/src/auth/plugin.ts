import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import type { SessionUser, SignupRequest } from '@stoperica/shared'
import type { FastifyReply, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { prisma } from '../db.js'
import { env } from '../env.js'
import { HttpError } from '../lib/errors.js'
import { escapeHtml, mailer } from '../lib/mailer.js'
import { findRacerByCredentials, isPhoneTaken } from './credentials.js'
import { signupSchema, toRacerData } from './profile.js'

const COOKIE_NAME = 'stoperica_session'
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: number }
    user: { sub: number }
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    /** Populates `request.session` when a valid session cookie is present. */
    optionalAuth: (request: FastifyRequest) => Promise<void>
    /** Requires a logged-in racer. */
    authenticate: (request: FastifyRequest) => Promise<void>
    /** Requires a logged-in racer with `admin = true`. */
    requireAdmin: (request: FastifyRequest) => Promise<void>
  }
  interface FastifyRequest {
    session: SessionUser | null
  }
}

const sessionSelect = { id: true, email: true, firstName: true, lastName: true, admin: true } as const

async function loadSession(id: number): Promise<SessionUser | null> {
  const racer = await prisma.racer.findUnique({ where: { id }, select: sessionSelect })
  return racer ? { ...racer, email: racer.email ?? '' } : null
}

async function startSession(reply: FastifyReply, racerId: number) {
  const token = await reply.jwtSign({ sub: racerId })
  reply.setCookie(COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    sameSite: env.cookieSameSite,
    secure: env.cookieSecure,
    maxAge: SESSION_TTL_SECONDS,
  })
}

export const authPlugin = fp(async (app) => {
  await app.register(cookie)
  await app.register(jwt, {
    secret: env.jwtSecret,
    cookie: { cookieName: COOKIE_NAME, signed: false },
    sign: { expiresIn: SESSION_TTL_SECONDS },
  })
  await app.register(rateLimit, { global: false })

  app.decorateRequest('session', null)

  app.decorate('optionalAuth', async (request: FastifyRequest) => {
    if (!request.cookies[COOKIE_NAME]) return
    try {
      await request.jwtVerify({ onlyCookie: true })
    } catch {
      return
    }
    // Loaded on every request so revoked admin rights / deleted racers take effect immediately.
    request.session = await loadSession(request.user.sub)
  })

  app.decorate('authenticate', async (request: FastifyRequest) => {
    await app.optionalAuth(request)
    if (!request.session) throw new HttpError(401, 'Prijava je potrebna')
  })

  app.decorate('requireAdmin', async (request: FastifyRequest) => {
    await app.authenticate(request)
    if (!request.session!.admin) throw new HttpError(403, 'Nemate administratorska prava')
  })

  const authRateLimit = { rateLimit: { max: 5, timeWindow: '1 minute' } }

  await app.register(
    async (auth) => {
      auth.post<{ Body: { email: string; phone: string } }>(
        '/login',
        {
          config: authRateLimit,
          schema: {
            body: {
              type: 'object',
              required: ['email', 'phone'],
              additionalProperties: false,
              properties: {
                email: { type: 'string', minLength: 3, maxLength: 255 },
                phone: { type: 'string', minLength: 6, maxLength: 30 },
              },
            },
          },
        },
        async (request, reply) => {
          const racer = await findRacerByCredentials(request.body.email, request.body.phone)
          if (!racer) throw new HttpError(401, 'Neispravan e-mail ili broj telefona')
          await startSession(reply, racer.id)
          return loadSession(racer.id)
        },
      )

      auth.post<{ Body: SignupRequest }>(
        '/signup',
        { config: authRateLimit, schema: { body: signupSchema } },
        async (request, reply) => {
          const body = request.body
          const email = body.email.trim()
          if (await prisma.racer.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })) {
            throw new HttpError(409, 'Natjecatelj s tim e-mailom već postoji. Prijavite se.')
          }
          if (await isPhoneTaken(body.phoneNumber)) {
            throw new HttpError(409, 'Natjecatelj s tim brojem telefona već postoji. Prijavite se.')
          }

          const racer = await prisma.racer.create({
            data: { ...(await toRacerData(body)), createdAt: new Date() },
            select: { id: true, email: true, firstName: true },
          })
          await mailer.send({
            to: racer.email!,
            subject: 'Dobrodošli na Stoperica.live',
            html: `<p>Pozdrav ${escapeHtml(racer.firstName)},</p><p>tvoj profil natjecatelja je kreiran. Za prijavu na utrku otvori utrku, odaberi kategoriju i potvrdi na "Prijavi se".</p>`,
          })
          await startSession(reply, racer.id)
          return reply.code(201).send(await loadSession(racer.id))
        },
      )

      auth.post('/logout', async (_request, reply) => {
        reply.clearCookie(COOKIE_NAME, { path: '/' })
        return reply.code(204).send()
      })

      auth.get('/me', { onRequest: app.authenticate }, async (request) => request.session)
    },
    { prefix: '/auth' },
  )
})
