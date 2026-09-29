// Type-only package: imports must use `import type` so nothing is emitted at runtime.

export type ScalarType =
  | 'String'
  | 'Int'
  | 'BigInt'
  | 'Float'
  | 'Decimal'
  | 'Boolean'
  | 'DateTime'
  | 'Json'
  | 'Bytes'

export interface FieldMeta {
  name: string
  kind: 'scalar' | 'enum' | 'object'
  /** Scalar type, enum name or related model name, depending on `kind`. */
  type: string
  /** Native DB type, e.g. `Inet`, `Date`, `Timestamp`. */
  nativeType: string | null
  isList: boolean
  isRequired: boolean
  isId: boolean
  isUnique: boolean
  isReadOnly: boolean
  hasDefault: boolean
  isUpdatedAt: boolean
  /** Set for scalar foreign key fields (e.g. `userId`) pointing to the relation. */
  foreignKeyFor: RelationRef | null
  /** Set for `kind: 'object'` fields. */
  relation: RelationMeta | null
}

export interface RelationRef {
  field: string
  model: string
  resource: string | null
}

export interface RelationMeta {
  model: string
  /** CRUD resource name of the related model, if it is exposed. */
  resource: string | null
  fromFields: string[]
  toFields: string[]
}

export interface ModelMeta {
  name: string
  resource: string
  label: string
  idField: string
  displayField: string
  fields: FieldMeta[]
  enums: Record<string, string[]>
  searchFields: string[]
}

export interface ListQuery {
  page?: number
  pageSize?: number
  sort?: string
  order?: 'asc' | 'desc'
  search?: string
}

export interface ListResponse<T = Record<string, unknown>> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface OptionItem {
  value: string | number
  label: string
}

/** The logged-in racer. */
export interface SessionUser {
  id: number
  email: string
  firstName: string | null
  lastName: string | null
  admin: boolean
}

// ---- Public site ----

/** Keys of the Rails `Race.race_type` enum, indexed by the stored integer. */
export type RaceType = 'mtb' | 'trcanje' | 'treking' | 'duatlon' | 'triatlon' | 'penjanje' | 'xco' | 'road'

export interface PublicRaceSummary {
  id: number
  name: string | null
  date: string | null
  raceType: RaceType | null
  pictureUrl: string | null
  locationUrl: string | null
  descriptionUrl: string | null
  registrationThreshold: string | null
  registrationOpen: boolean
  league: { id: number; name: string | null; slug: string | null } | null
  registeredCount: number
}

export interface PublicRacer {
  id: number
  firstName: string | null
  lastName: string | null
  /** 1 = female, 2 = male */
  gender: number | null
  country: string | null
  club: string | null
  /** Only present for races with `uciDisplay`. */
  uciId: string | null
}

/** A lap (XCO) or control point (treking/triathlon) split. */
export interface PublicSplit {
  label: string
  /** Time since start, e.g. "0:29:26". */
  time: string | null
  /** Time since the previous lap / control point. */
  split: string | null
  /** Control point was not registered for this racer. */
  missed: boolean
}

export interface PublicResult {
  id: number
  /** 1 registered, 2 at start, 3 finished, 4 DNF, 5 DSQ, 6 DNS */
  status: number | null
  position: number | null
  finishTime: string | null
  finishDelta: string | null
  points: number | null
  startNumber: string | null
  racer: PublicRacer
  splits: PublicSplit[]
}

export interface PublicCategory {
  id: number | null
  name: string
  trackLength: number | null
  results: PublicResult[]
}

export interface MyRegistration {
  id: number
  categoryId: number | null
  status: number | null
}

export interface PublicRaceDetail extends PublicRaceSummary {
  descriptionText: string | null
  startedAt: string | null
  endedAt: string | null
  millisDisplay: boolean
  uciDisplay: boolean
  waiverRequired: boolean
  cancellationAllowed: boolean
  categories: PublicCategory[]
  myRegistration: MyRegistration | null
}

export type ShirtSize = 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL'

export interface RacerProfile {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  /** 1 = female, 2 = male */
  gender: 1 | 2
  dayOfBirth: number
  monthOfBirth: number
  yearOfBirth: number
  clubId: number | null
  address: string
  zipCode: string
  town: string
  /** ISO 3166-1 alpha-2, e.g. `HR` */
  country: string
  shirtSize: ShirtSize
  /** Empty for racers without a UCI licence (stored as "Jednodnevna"). */
  uciId: string | null
}

export type LeagueType = 'xczld' | 'lead' | 'running' | 'trail' | 'stage_competitors_only'

export interface LeagueSummary {
  id: number
  slug: string
  name: string | null
  leagueType: LeagueType | null
  raceType: RaceType | null
  raceCount: number
  finishedCount: number
  firstDate: string | null
  lastDate: string | null
  /** `active` while at least one race is still to come. */
  status: 'active' | 'finished'
  nextRace: { id: number; name: string | null; date: string | null } | null
  pictureUrl: string | null
  /** Club standings leader (winner once the league is finished). */
  clubLeader: string | null
}

export interface LeagueRace {
  id: number
  round: number
  name: string | null
  date: string | null
  status: 'finished' | 'next' | 'upcoming'
  registrationOpen: boolean
}

export interface StandingValues {
  /** Competition ranking: tied entries share a place (1, 2, 3, 3, 5). */
  place: number
  total: string
  /** Difference to the leader, `null` for the leader. */
  gap: string | null
  /** One entry per league race (same order as `LeagueDetail.races`), `null` when absent. */
  rounds: (string | null)[]
}

export interface RacerStanding extends StandingValues {
  racer: { id: number; firstName: string | null; lastName: string | null; country: string | null; club: string | null }
}

export interface ClubStanding extends StandingValues {
  club: { id: number; name: string | null }
}

export interface RacerStandingCategory {
  key: string
  name: string
  rows: RacerStanding[]
}

export interface LeagueDetail extends LeagueSummary {
  races: LeagueRace[]
  racerCount: number
  /** `time` for stage leagues ranked by total time, otherwise points. */
  standingsMode: 'points' | 'time'
  racerStandings: RacerStandingCategory[] | null
  clubStandings: ClubStanding[] | null
}

export interface SignupRequest extends RacerProfile {
  /** Acceptance of the data usage statement shown at `/terms`. */
  termsAccepted: true
}

export interface ClubOption {
  id: number
  name: string
}
