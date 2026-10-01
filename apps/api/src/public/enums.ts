// Rails integer enums (see the legacy app's models). Array index = stored value.

export const RACE_TYPES = ['mtb', 'trcanje', 'treking', 'duatlon', 'triatlon', 'penjanje', 'xco', 'road'] as const

/** Dropdown labels for `RACE_TYPES`, same index as the stored integer. */
export const RACE_TYPE_LABELS = ['MTB', 'Trčanje', 'Treking', 'Duatlon', 'Triatlon', 'Penjanje', 'XCO', 'Cestovni'] as const

export const LEAGUE_TYPES = ['xczld', 'lead', 'running', 'trail', 'stage_competitors_only'] as const

/** Dropdown labels for `LEAGUE_TYPES`, same index as the stored integer. */
export const LEAGUE_TYPE_LABELS = ['XCZLD', 'Sportsko penjanje', 'Trčanje', 'Trail', 'Etapna utrka'] as const

export const RESULT_STATUS = {
  registered: 1,
  atStart: 2,
  finished: 3,
  dnf: 4,
  dsq: 5,
  dns: 6,
} as const

export const GENDER = { female: 1, male: 2 } as const

/** Rails `Racer.gender`: 1 female, 2 male. Index 0 is unused. */
export const GENDER_LABELS = ['—', 'Ženski', 'Muški'] as const

/** Rails `Club.category` enum. Array index = stored value. */
export const CLUB_CATEGORIES = [
  'biciklisticki',
  'triatlon',
  'atletski',
  'skole',
  'ostali',
  'penjacki',
  'trail_trekking',
  'trkacki_running',
  'pro',
  'timovi',
  'daljinsko_plivanje',
] as const

export const CLUB_CATEGORY_LABELS = [
  'Biciklistički',
  'Triatlon',
  'Atletski',
  'Škole',
  'Ostali',
  'Penjački',
  'Trail / trekking',
  'Trkački',
  'Pro',
  'Timovi',
  'Daljinsko plivanje',
] as const

/** Rails `Category.category` enum. Array index = stored value. */
export const CATEGORIES = [
  'zene', 'u16', '16-20', '20-30', '30-40', '40-50', '50', 'muskarci', 'u9m', 'u9w', 'u11m', 'u11w', 'u13m', 'u13w',
  'u15m', 'u15w', 'u17', '17-19', '19-30', 'zeneu30', 'zene30', 'ebikem', 'ebikez', 'seniori', 'juniori', 'mladi',
  'u7m', 'u7z', 'u23', 'u30', 'veteran_a', 'veteran_b', 'veteran_c', 'veteran_d', 'zeneu35', 'zene35',
] as const

/** Dropdown labels for `CATEGORIES`, same index as the stored integer. */
export const CATEGORY_LABELS = [
  'Žene', 'U16', '16-20', '20-30', '30-40', '40-50', '50', 'Muškarci', 'U9 M', 'U9 Ž', 'U11 M', 'U11 Ž', 'U13 M', 'U13 Ž',
  'U15 M', 'U15 Ž', 'U17', '17-19', '19-30', 'Žene U30', 'Žene 30', 'E-bike M', 'E-bike Ž', 'Seniori', 'Juniori', 'Mladi',
  'U7 M', 'U7 Ž', 'U23', 'U30', 'Veteran A', 'Veteran B', 'Veteran C', 'Veteran D', 'Žene U35', 'Žene 35+',
] as const

if (RACE_TYPE_LABELS.length !== RACE_TYPES.length) {
  throw new Error('RACE_TYPE_LABELS must have one entry per RACE_TYPES value')
}
if (LEAGUE_TYPE_LABELS.length !== LEAGUE_TYPES.length) {
  throw new Error('LEAGUE_TYPE_LABELS must have one entry per LEAGUE_TYPES value')
}
if (CATEGORY_LABELS.length !== CATEGORIES.length) {
  throw new Error('CATEGORY_LABELS must have one entry per CATEGORIES value')
}
if (CLUB_CATEGORY_LABELS.length !== CLUB_CATEGORIES.length) {
  throw new Error('CLUB_CATEGORY_LABELS must have one entry per CLUB_CATEGORIES value')
}
