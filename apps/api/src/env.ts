function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable ${name}`)
  return value
}

const isProduction = process.env.NODE_ENV === 'production'
const jwtSecret = required('JWT_SECRET')
if (isProduction && jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production')
}

export const env = {
  isProduction,
  databaseUrl: required('DATABASE_URL'),
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '127.0.0.1',
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  jwtSecret,
  // Use "none" only when admin and API live on different sites (requires HTTPS).
  cookieSameSite: (process.env.COOKIE_SAMESITE ?? 'lax') as 'lax' | 'strict' | 'none',
  cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProduction,
  /** Gmail app password for stoperica.timing@gmail.com. Unset keeps mail in the server log. */
  emailPassword: process.env.EMAIL_PASSWORD || null,
  publicWebUrl: (process.env.PUBLIC_WEB_URL ?? 'https://www.stoperica.live').replace(/\/$/, ''),
}
