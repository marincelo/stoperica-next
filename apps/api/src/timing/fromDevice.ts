import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { prisma, type Prisma } from '../db.js'
import { RACE_TYPES, RESULT_STATUS } from '../public/enums.js'
import { racePageCache } from '../public/raceCache.js'
import { insertLapTime, lapClock, liveFinishTime } from './laps.js'

type DeviceParams = Record<string, unknown>

function str(value: unknown): string {
  return value == null ? '' : String(value)
}

function present(value: unknown): boolean {
  return str(value).trim() !== ''
}

function raceIdsFrom(value: unknown): number[] {
  return str(value)
    .split(',')
    .map((part) => Number(part))
    .filter((id) => Number.isInteger(id) && id > 0)
}

/** Rails `DateTime.strptime(TIME, '%d.%m.%Y %H:%M:%S.%L %:z')` then `to_f`. */
export function parseDeviceTime(raw: string): Date | null {
  let text = raw.trim()
  try {
    text = decodeURIComponent(text.replace(/\+/g, '%2B'))
  } catch {
    /* already decoded */
  }
  text = text.replace(/%2B/gi, '+').trim()
  const match = /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(?:\s+([+-]?\d{2}:?\d{2}))?/.exec(text)
  if (!match) return null
  const [, dd, mm, yyyy, hh, min, ss, frac = '0', tzRaw = '+00:00'] = match
  const tz = /^[+-]/.test(tzRaw) ? tzRaw : `+${tzRaw}`
  const zone = tz.includes(':') ? tz : `${tz.slice(0, 3)}:${tz.slice(3)}`
  const millis = frac.padEnd(3, '0').slice(0, 3)
  const date = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}.${millis}${zone}`)
  return Number.isNaN(date.getTime()) ? null : date
}

function paramsOf(request: FastifyRequest): DeviceParams {
  const query = (request.query ?? {}) as DeviceParams
  const body = request.body && typeof request.body === 'object' && !Array.isArray(request.body) ? (request.body as DeviceParams) : {}
  return { ...query, ...body }
}

function deviceError(reply: FastifyReply, status: number, error: string) {
  return reply.code(status).send({ status, error })
}

async function authorizeDevice(request: FastifyRequest, reply: FastifyReply) {
  const params = paramsOf(request)
  const raceIds = raceIdsFrom(params.RACEID)
  if (!raceIds.length) {
    await deviceError(reply, 404, 'Not Found')
    return null
  }

  const races = await prisma.race.findMany({
    where: { id: { in: raceIds } },
    select: {
      id: true,
      name: true,
      poolId: true,
      skipAuth: true,
      authToken: true,
      startedAt: true,
      endedAt: true,
      millisDisplay: true,
      raceType: true,
    },
  })

  if (raceIds.length > 1) {
    const allowed = races.length === raceIds.length && races.every((race) => race.skipAuth)
    if (!allowed) {
      await deviceError(reply, 405, 'To Update multiple races, all of them should skip auth')
      return null
    }
  } else {
    const race = races[0]
    if (!race) {
      await deviceError(reply, 404, 'Not Found')
      return null
    }
    if (!race.skipAuth && race.authToken !== str(params.TOKEN).trim()) {
      await deviceError(reply, 403, 'You are not allowed to update this race')
      return null
    }
  }

  return { params, raceIds, races }
}

function fullName(racer: { firstName: string | null; lastName: string | null } | null): string {
  return `${racer?.firstName ?? ''} ${racer?.lastName ?? ''}`
}

export const deviceRoutes: FastifyPluginAsync = async (app) => {
  const fromDevice = async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = await authorizeDevice(request, reply)
    if (!auth) return
    const { params, raceIds, races } = auth
    const readerId = str(params.READERID)
    const tagId = str(params.TAGID).trim()
    const bibId = str(params.BIBID).trim()
    const poolIds = [...new Set(races.map((race) => race.poolId).filter((id): id is bigint => id != null))]

    const startNumber = present(params.TAGID)
      ? ((await prisma.startNumber.findFirst({ where: { poolId: { in: poolIds }, tagId } })) ??
        (await prisma.startNumber.findFirst({ where: { poolId: { in: poolIds }, alternateTagId: tagId } })))
      : present(params.BIBID)
        ? await prisma.startNumber.findFirst({ where: { poolId: { in: poolIds }, value: bibId } })
        : null

    if (!startNumber) {
      return reply.send({
        error: 'Tag not in database',
        tag_id: params.TAGID ?? null,
        bib_id: params.BIBID ?? null,
        race_id: params.RACEID ?? null,
      })
    }

    const result = await prisma.raceResult.findFirst({
      where: { raceId: { in: raceIds }, startNumberId: startNumber.id },
      include: {
        racer: { select: { firstName: true, lastName: true } },
        race: {
          select: { id: true, startedAt: true, endedAt: true, millisDisplay: true, raceType: true },
        },
      },
    })

    if (!result?.race) {
      return reply.send({
        error: 'Bib not assigned.',
        tag_id: params.TAGID ?? null,
        race_id: params.RACEID ?? null,
        start_number: startNumber.value,
      })
    }

    if (result.race.endedAt || result.race.startedAt == null) {
      return reply.send({
        error: 'Race inactive',
        tag_id: params.TAGID ?? null,
        race_id: params.RACEID ?? null,
        start_number: startNumber.value,
        racer: fullName(result.racer),
      })
    }

    const hitAt = parseDeviceTime(str(params.TIME))
    if (!hitAt) return reply.code(400).send({ error: 'Invalid TIME' })

    const xco = RACE_TYPES[result.race.raceType ?? -1] === 'xco'
    const clockArgs = {
      status: RESULT_STATUS.finished,
      startedAt: result.startedAt,
      raceStartedAt: result.race.startedAt,
      millisDisplay: result.race.millisDisplay ?? false,
      xco,
    }

    if (readerId === '100') {
      const finishTime = lapClock({ ...clockArgs, laps: result.lapTimes, startedAt: hitAt, position: null })
      await prisma.raceResult.update({
        where: { id: result.id },
        data: { startedAt: hitAt, finishTime },
      })
      result.startedAt = hitAt
      result.finishTime = finishTime
    } else {
      const laps = insertLapTime(result.lapTimes, hitAt.getTime() / 1000, readerId, xco)
      const finishTime = lapClock({ ...clockArgs, laps, status: RESULT_STATUS.finished, position: null })
      await prisma.raceResult.update({
        where: { id: result.id },
        data: { lapTimes: laps as unknown as Prisma.InputJsonValue, status: RESULT_STATUS.finished, finishTime },
      })
      result.lapTimes = laps as unknown as Prisma.JsonValue
      result.status = RESULT_STATUS.finished
      result.finishTime = finishTime
    }

    racePageCache.invalidate(result.race.id)

    return reply.send({
      finish_time: liveFinishTime({ ...clockArgs, laps: result.lapTimes, startedAt: result.startedAt, status: result.status }),
      racer_name: fullName(result.racer),
      start_number: startNumber.value,
      tag_id: startNumber.tagId,
      alternate_tag_id: startNumber.alternateTagId,
      started_at: result.startedAt,
    })
  }

  const checkToken = async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = await authorizeDevice(request, reply)
    if (!auth) return
    const race = auth.races[0]
    return reply.send({ status: 200, message: `Authorization passed - '${race?.name ?? ''}'` })
  }

  app.route({ method: ['GET', 'POST'], url: '/from_device', handler: fromDevice })
  app.get('/check_token', checkToken)
}
