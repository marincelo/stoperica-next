import type { FastifyPluginAsync } from 'fastify'
import { raceResultRoutes } from './admin/raceResults.js'
import { crudPlugin } from './crud/plugin.js'
import { resource, type ResourceEntry } from './crud/resource.js'
import { exportRoutes } from './exports/routes.js'
import { CATEGORY_LABELS, LEAGUE_TYPE_LABELS, RACE_TYPE_LABELS } from './public/enums.js'
import { invalidateCategoryRace, invalidateStartNumberRaces, rememberCategoryRace, rememberStartNumberRaces } from './public/invalidateRacePage.js'
import { publicLeagueRoutes } from './public/leagues.js'
import { clubRoutes, meRoutes } from './public/me.js'
import { racePageCache } from './public/raceCache.js'
import { publicRacerRoutes } from './public/racers.js'
import { publicRaceRoutes } from './public/races.js'
import { deviceRoutes } from './timing/fromDevice.js'

/**
 * Models exposed as generic admin CRUD. Use a bare model name, or
 * `resource('Model', { label, hidden, displayField })` for customization.
 */
const adminResources: ResourceEntry[] = [
  resource('Race', {
    label: 'Utrke',
    intEnums: { raceType: RACE_TYPE_LABELS },
    afterWrite: (id) => racePageCache.invalidate(Number(id)),
  }),
  resource('League', { label: 'Natjecanja', intEnums: { leagueType: LEAGUE_TYPE_LABELS } }),
  resource('Pool', { label: 'Baze brojeva' }),
  resource('StartNumber', {
    label: 'Startni brojevi',
    displayField: 'value',
    beforeWrite: (id) => rememberStartNumberRaces(Number(id)),
    afterWrite: (id) => invalidateStartNumberRaces(Number(id)),
  }),
  resource('RaceAdmin', { label: 'Administratori utrka' }),
  resource('Category', {
    label: 'Kategorije',
    intEnums: { category: CATEGORY_LABELS },
    beforeWrite: (id) => rememberCategoryRace(Number(id)),
    afterWrite: (id) => invalidateCategoryRace(Number(id)),
  }),
]

export const router: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => ({ ok: true }))

  await app.register(publicRaceRoutes, { prefix: '/races' })
  await app.register(publicRacerRoutes, { prefix: '/racers' })
  await app.register(publicLeagueRoutes, { prefix: '/leagues' })
  await app.register(clubRoutes, { prefix: '/clubs' })
  await app.register(meRoutes, { prefix: '/me' })
  await app.register(deviceRoutes, { prefix: '/race_results' })

  await app.register(
    async (admin) => {
      admin.addHook('onRequest', app.requireAdmin)
      await admin.register(crudPlugin, { resources: adminResources })
      await admin.register(exportRoutes, { prefix: '/exports' })
      await admin.register(raceResultRoutes)
    },
    { prefix: '/admin' },
  )
}
