import type { FastifyError, FastifyInstance } from 'fastify'

export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message)
  }
}

const PRISMA_ERRORS: Record<string, { status: number; message: string }> = {
  P2025: { status: 404, message: 'Zapis nije pronađen' },
  P2002: { status: 409, message: 'Zapis s tom jedinstvenom vrijednošću već postoji' },
  P2003: { status: 409, message: 'Zapis je povezan s drugim zapisima i ne može se obrisati ili spremiti' },
  P2000: { status: 400, message: 'Vrijednost je preduga za polje' },
}

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError & { code?: string; meta?: unknown }, request, reply) => {
    if (error instanceof HttpError) {
      return reply.code(error.statusCode).send({ message: error.message })
    }
    if (error.validation) {
      return reply.code(400).send({ message: 'Neispravni podaci', details: error.validation })
    }
    const prismaError = error.code && /^P\d{4}$/.test(error.code) ? PRISMA_ERRORS[error.code] : undefined
    if (prismaError) {
      request.log.info({ code: error.code, meta: error.meta }, 'prisma error')
      return reply.code(prismaError.status).send({ message: prismaError.message })
    }
    if (error.statusCode && error.statusCode < 500) {
      return reply.code(error.statusCode).send({ message: error.message })
    }
    request.log.error(error)
    return reply.code(500).send({ message: 'Greška na poslužitelju' })
  })
}
