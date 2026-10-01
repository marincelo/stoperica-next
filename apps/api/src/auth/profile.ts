import type { RacerProfile } from '@stoperica/shared'
import { prisma } from '../db.js'
import { HttpError } from '../lib/errors.js'

/** Rails stores this instead of a UCI ID for racers without a licence. */
export const NO_UCI_ID = 'Jednodnevna'
const DEFAULT_CLUB_NAME = 'Individual'
export const SHIRT_SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const

const text = (maxLength = 255) => ({ type: 'string', minLength: 1, maxLength })

export const profileSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'firstName', 'lastName', 'email', 'phoneNumber', 'gender', 'dayOfBirth', 'monthOfBirth',
    'yearOfBirth', 'address', 'zipCode', 'town', 'country', 'shirtSize',
  ],
  properties: {
    firstName: text(100),
    lastName: text(100),
    email: { type: 'string', format: 'email', maxLength: 255 },
    phoneNumber: { type: 'string', pattern: '^[+0-9 ()/-]{6,30}$' },
    gender: { type: 'integer', enum: [1, 2] },
    dayOfBirth: { type: 'integer', minimum: 1, maximum: 31 },
    monthOfBirth: { type: 'integer', minimum: 1, maximum: 12 },
    yearOfBirth: { type: 'integer', minimum: 1900, maximum: new Date().getFullYear() },
    clubId: { type: ['integer', 'null'] },
    address: text(),
    zipCode: text(20),
    town: text(100),
    country: { type: 'string', pattern: '^[A-Z]{2}$' },
    shirtSize: { type: 'string', enum: SHIRT_SIZES },
    uciId: { type: ['string', 'null'], maxLength: 30 },
  },
} as const

/** Signing up requires accepting the data usage statement (`/terms`). */
export const signupSchema = {
  ...profileSchema,
  required: [...profileSchema.required, 'termsAccepted'],
  properties: { ...profileSchema.properties, termsAccepted: { type: 'boolean', const: true } },
} as const

function contactAndDetails(profile: RacerProfile) {
  const uciId = profile.uciId?.replace(/\s/g, '') || NO_UCI_ID
  if (uciId !== NO_UCI_ID && !/^\d{3,14}$/.test(uciId)) throw new HttpError(400, 'UCI ID mora imati 3 do 14 znamenki')

  return {
    email: profile.email.trim(),
    phoneNumber: profile.phoneNumber.replace(/\D/g, ''),
    gender: profile.gender,
    dayOfBirth: profile.dayOfBirth,
    monthOfBirth: profile.monthOfBirth,
    yearOfBirth: profile.yearOfBirth,
    address: profile.address.trim(),
    zipCode: profile.zipCode.trim(),
    town: profile.town.trim(),
    country: profile.country,
    shirtSize: profile.shirtSize,
    uciId,
  }
}

async function resolveClubId(clubId: number | null) {
  if (clubId === null) {
    const individual = await prisma.club.findFirst({ where: { name: DEFAULT_CLUB_NAME }, select: { id: true } })
    return individual?.id ?? null
  }
  if (!(await prisma.club.findUnique({ where: { id: clubId }, select: { id: true } }))) {
    throw new HttpError(400, 'Odabrani klub ne postoji')
  }
  return clubId
}

/** Applies the Rails `before_save` rules: default club, UCI ID normalization, digits-only phone. */
export async function toRacerData(profile: RacerProfile) {
  return {
    ...contactAndDetails(profile),
    firstName: profile.firstName.trim(),
    lastName: profile.lastName.trim(),
    clubId: await resolveClubId(profile.clubId),
  }
}

/** Profile edits cannot change name or club; those stay as the admin-managed identity. */
export function toProfileUpdateData(profile: RacerProfile) {
  return contactAndDetails(profile)
}

export function toProfile(racer: {
  firstName: string | null
  lastName: string | null
  email: string | null
  phoneNumber: string | null
  gender: number | null
  dayOfBirth: number | null
  monthOfBirth: number | null
  yearOfBirth: number | null
  clubId: number | null
  address: string | null
  zipCode: string | null
  town: string | null
  country: string | null
  shirtSize: string | null
  uciId: string | null
}): Partial<RacerProfile> {
  return {
    ...racer,
    gender: racer.gender === 1 || racer.gender === 2 ? racer.gender : undefined,
    shirtSize: (SHIRT_SIZES as readonly string[]).includes(racer.shirtSize ?? '')
      ? (racer.shirtSize as RacerProfile['shirtSize'])
      : undefined,
    uciId: racer.uciId === NO_UCI_ID ? null : racer.uciId,
  } as Partial<RacerProfile>
}
