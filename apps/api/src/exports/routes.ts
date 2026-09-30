import type { RaceExportType } from '@stoperica/shared'
import type { FastifyPluginAsync } from 'fastify'
import { loadExportRace } from './data.js'
import { RACE_EXPORTS } from './raceExports.js'

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/** `filename*` carries the real (UTF-8) name; `filename` is an ASCII fallback for old clients. */
function contentDisposition(name: string) {
  const ascii = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (c) => (c === 'đ' ? 'd' : 'D'))
    .replace(/[^\w .-]/g, '_')
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`
}

/** Registered under the admin scope, so every route here requires an admin session. */
export const exportRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { id: number; type: RaceExportType } }>(
    '/races/:id/:type',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id', 'type'],
          properties: {
            id: { type: 'integer', minimum: 1 },
            type: { type: 'string', enum: Object.keys(RACE_EXPORTS) },
          },
        },
      },
    },
    async (request, reply) => {
      const definition = RACE_EXPORTS[request.params.type]
      const race = await loadExportRace(request.params.id)
      const buffer = await definition.build(race).toBuffer()
      const filename = `${definition.filename} ${race.name}.xlsx`.replace(/[/\\]/g, '-')
      return reply
        .header('content-type', XLSX_MIME)
        .header('content-disposition', contentDisposition(filename))
        .header('cache-control', 'no-store')
        .send(buffer)
    },
  )
}
