// Rails integer enums (see the legacy app's models). Array index = stored value.

export const RACE_TYPES = ['mtb', 'trcanje', 'treking', 'duatlon', 'triatlon', 'penjanje', 'xco', 'road'] as const

export const LEAGUE_TYPES = ['xczld', 'lead', 'running', 'trail', 'stage_competitors_only'] as const

export const RESULT_STATUS = {
  registered: 1,
  atStart: 2,
  finished: 3,
  dnf: 4,
  dsq: 5,
  dns: 6,
} as const

export const GENDER = { female: 1, male: 2 } as const

/** Rails `Category.category` enum. */
export const CATEGORIES = [
  'zene', 'u16', '16-20', '20-30', '30-40', '40-50', '50', 'muskarci', 'u9m', 'u9w', 'u11m', 'u11w', 'u13m', 'u13w',
  'u15m', 'u15w', 'u17', '17-19', '19-30', 'zeneu30', 'zene30', 'ebikem', 'ebikez', 'seniori', 'juniori', 'mladi',
  'u7m', 'u7z', 'u23', 'u30', 'veteran_a', 'veteran_b', 'veteran_c', 'veteran_d', 'zeneu35', 'zene35',
] as const
