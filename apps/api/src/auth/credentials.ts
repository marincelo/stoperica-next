import { prisma } from '../db.js'
import { normalizePhone, phonesMatch } from './phone.js'

/** Racers whose stored phone could match `phone` (narrowed in SQL, confirmed with `phonesMatch`). */
async function racersWithPhone(phone: string, where: object = {}) {
  const normalized = normalizePhone(phone)
  if (normalized.length < 6) return []
  const candidates = await prisma.racer.findMany({
    where: { ...where, phoneNumber: { endsWith: normalized.slice(-6) } },
    select: { id: true, phoneNumber: true },
  })
  return candidates.filter((racer) => phonesMatch(racer.phoneNumber, phone))
}

export async function findRacerByCredentials(email: string, phone: string) {
  const [racer] = await racersWithPhone(phone, { email: { equals: email.trim(), mode: 'insensitive' } })
  return racer ?? null
}

export async function isPhoneTaken(phone: string, exceptRacerId?: number) {
  const matches = await racersWithPhone(phone)
  return matches.some((racer) => racer.id !== exceptRacerId)
}
