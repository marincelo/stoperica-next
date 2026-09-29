import cors from '@fastify/cors'
import Fastify from 'fastify'
import { authPlugin } from './auth/plugin.js'
import { env } from './env.js'
import { HttpError, registerErrorHandler } from './lib/errors.js'
import { stringify } from './lib/json.js'
import { router } from './router.js'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export async function buildApp() {
  const app = Fastify({
    logger: true,
    trustProxy: env.isProduction,
  })

  app.setReplySerializer((payload) => stringify(payload))
  registerErrorHandler(app)

  await app.register(cors, {
    origin: env.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['content-type', 'x-stoperica-client'],
  })

  await app.register(
    async (api) => {
      // CSRF guard: cross-site forms cannot set custom headers, and CORS blocks them from other origins.
      api.addHook('onRequest', async (request) => {
        if (!SAFE_METHODS.has(request.method) && request.headers['x-stoperica-client'] !== '1') {
          throw new HttpError(403, 'Nedostaje zaglavlje klijenta')
        }
      })
      await api.register(authPlugin)
      await api.register(router)
    },
    { prefix: '/api' },
  )

  return app
}
