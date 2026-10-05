import type { FastifyPluginAsync } from 'fastify'
import { leagueClubRoutes } from './admin/leagueClubs.js'
import { raceResultRoutes } from './admin/raceResults.js'
import { timingRoutes } from './admin/timing.js'
import { crudPlugin } from './crud/plugin.js'
import { resource, type ResourceEntry } from './crud/resource.js'
import { exportRoutes } from './exports/routes.js'
import { CATEGORY_LABELS, CLUB_CATEGORY_LABELS, GENDER_LABELS, LEAGUE_TYPE_LABELS, RACE_TYPE_LABELS } from './public/enums.js'
import {
  invalidateCategoryRace,
  invalidateClubRaces,
  invalidateRacerRaces,
  invalidateStartNumberRaces,
  rememberCategoryRace,
  rememberClubRaces,
  rememberRacerRaces,
  rememberStartNumberRaces,
} from './public/invalidateRacePage.js'
import { publicLeagueRoutes } from './public/leagues.js'
import { clubRoutes } from './public/clubs.js'
import { meRoutes } from './public/me.js'
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
  resource('Club', {
    label: 'Klubovi',
    intEnums: { category: CLUB_CATEGORY_LABELS },
    beforeWrite: (id) => rememberClubRaces(Number(id)),
    afterWrite: (id) => invalidateClubRaces(Number(id)),
  }),
  resource('Racer', {
    label: 'Natjecatelji',
    displayField: 'lastName',
    displayFields: ['lastName', 'firstName'],
    intEnums: { gender: GENDER_LABELS },
    beforeWrite: (id) => rememberRacerRaces(Number(id)),
    afterWrite: (id) => invalidateRacerRaces(Number(id)),
  }),
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
      await admin.register(leagueClubRoutes, { prefix: '/leagues' })
      await admin.register(exportRoutes, { prefix: '/exports' })
      await admin.register(raceResultRoutes)
      await admin.register(timingRoutes, { prefix: '/timing' })
    },
    { prefix: '/admin' },
  )
}
