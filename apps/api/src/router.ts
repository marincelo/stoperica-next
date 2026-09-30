import type { FastifyPluginAsync } from 'fastify'
import { crudPlugin } from './crud/plugin.js'
import { resource, type ResourceEntry } from './crud/resource.js'
import { exportRoutes } from './exports/routes.js'
import { CATEGORY_LABELS } from './public/enums.js'
import { invalidateCategoryRace, invalidateStartNumberRaces, rememberCategoryRace, rememberStartNumberRaces } from './public/invalidateRacePage.js'
import { publicLeagueRoutes } from './public/leagues.js'
import { clubRoutes, meRoutes } from './public/me.js'
import { racePageCache } from './public/raceCache.js'
import { publicRaceRoutes } from './public/races.js'

/**
 * Models exposed as generic admin CRUD. Use a bare model name, or
 * `resource('Model', { label, hidden, displayField })` for customization.
 */
const adminResources: ResourceEntry[] = [
  resource('Race', { label: 'Utrke', afterWrite: (id) => racePageCache.invalidate(Number(id)) }),
  resource('League', { label: 'Natjecanja' }),
  resource('Pool', { label: 'Baze brojeva', plainForeignKeys: true }),
  resource('StartNumber', {
    label: 'Startni brojevi',
    displayField: 'value',
    plainForeignKeys: true,
    beforeWrite: (id) => rememberStartNumberRaces(Number(id)),
    afterWrite: (id) => invalidateStartNumberRaces(Number(id)),
  }),
  resource('RaceAdmin', { label: 'Administratori utrka', plainForeignKeys: true }),
  resource('Category', {
    label: 'Kategorije',
    plainForeignKeys: true,
    intEnums: { category: CATEGORY_LABELS },
    beforeWrite: (id) => rememberCategoryRace(Number(id)),
    afterWrite: (id) => invalidateCategoryRace(Number(id)),
  }),
]

export const router: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => ({ ok: true }))

  await app.register(publicRaceRoutes, { prefix: '/races' })
  await app.register(publicLeagueRoutes, { prefix: '/leagues' })
  await app.register(clubRoutes, { prefix: '/clubs' })
  await app.register(meRoutes, { prefix: '/me' })

  await app.register(
    async (admin) => {
      admin.addHook('onRequest', app.requireAdmin)
      await admin.register(crudPlugin, { resources: adminResources })
      await admin.register(exportRoutes, { prefix: '/exports' })
      // Custom admin routes go here, e.g. `await admin.register(raceTimingRoutes, { prefix: '/timing' })`.
    },
    { prefix: '/admin' },
  )
}
