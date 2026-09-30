import type { RaceExportType } from '@stoperica/shared'
import { GENDER } from '../public/enums.js'
import { sortResults } from '../public/races.js'
import { countryName } from './countries.js'
import {
  birthDate,
  cleanTime,
  firstName,
  clubName,
  fullAddress,
  genderLabel,
  lastName,
  nat,
  prettyStatus,
  type ExportRace,
} from './data.js'
import { numeric, SheetBuilder, type Cell, type Column } from './workbook.js'

interface RaceExport {
  /** File name without extension; the race name is appended. */
  filename: string
  build(race: ExportRace): SheetBuilder
}

const col = (header: string, width: number): Column => ({ header, width })
const uciColumn = (show: boolean) => (show ? [col('UCI ID', 14)] : [])
const uciCell = (show: boolean, uciId: string | null): Cell[] => (show ? [uciId ?? ''] : [])

/** Ported from Rails `Race#to_xlsx` ("Svi podaci"). */
function allData(race: ExportRace) {
  const uci = race.uciDisplay
  const sheet = new SheetBuilder('Svi podaci', [
    col('Startni broj', 12),
    ...uciColumn(uci),
    col('Prezime', 18),
    col('Ime', 16),
    col('Nat', 6),
    col('Klub', 26),
    col('Država', 16),
    col('Kategorija', 22),
    col('Majica', 8),
    col('Datum rođenja', 14),
    col('Prebivalište', 36),
    col('Email', 30),
    col('Mobitel', 16),
    col('Personal Best', 14),
  ])
  for (const r of race.results) {
    const racer = r.racer
    sheet.row([
      numeric(r.startNumber?.value),
      ...uciCell(uci, racer.uciId),
      lastName(racer),
      firstName(racer),
      nat(racer),
      clubName(racer, uci),
      countryName(racer.country),
      r.category?.name ?? '',
      racer.shirtSize ?? '',
      birthDate(racer),
      fullAddress(racer),
      racer.email ?? '',
      racer.phoneNumber ?? '',
      racer.personalBest?.replaceAll(',', '.').replaceAll(';', ':') ?? '',
    ])
  }
  return sheet
}

/** Ported from Rails `Race#to_start_list_xlsx`. */
function startList(race: ExportRace) {
  const uci = race.uciDisplay
  const sheet = new SheetBuilder('Startna lista', [
    col('Startni broj', 12),
    ...uciColumn(uci),
    col('Prezime', 18),
    col('Ime', 16),
    col('Nat', 6),
    col('Datum rođenja', 14),
    col('Klub', 26),
  ])
  for (const group of race.byCategory) {
    sheet.group(group.name)
    for (const r of group.results) {
      sheet.row([
        numeric(r.startNumber?.value),
        ...uciCell(uci, r.racer.uciId),
        lastName(r.racer),
        firstName(r.racer),
        nat(r.racer),
        birthDate(r.racer),
        clubName(r.racer, uci),
      ])
    }
  }
  return sheet
}

/** Ported from Rails `Race#to_results_xlsx(uci_display)`. */
function results(race: ExportRace, forceUci: boolean) {
  const uci = race.uciDisplay || forceUci
  const sheet = new SheetBuilder('Rezultati', [
    col('Pozicija', 9),
    col('Startni broj', 12),
    ...uciColumn(uci),
    col('Prezime', 18),
    col('Ime', 16),
    col('Nat', 6),
    col('Klub', 26),
    col('Vrijeme', 12),
    col('Zaostatak', 14),
  ])
  for (const group of race.byCategory) {
    sheet.group(group.name)
    for (const r of group.results) {
      sheet.row([
        r.position,
        numeric(r.startNumber?.value),
        ...uciCell(uci, r.racer.uciId),
        lastName(r.racer),
        firstName(r.racer),
        nat(r.racer),
        clubName(r.racer, race.uciDisplay),
        cleanTime(r.finishTime),
        cleanTime(r.finishDelta),
      ])
    }
  }
  return sheet
}

/** Ported from Rails `Race#to_dataride_results_xlsx`. Column names follow the Dataride import format. */
function dataride(race: ExportRace) {
  const uci = race.uciDisplay
  const sheet = new SheetBuilder('Rezultati', [
    col('Rank', 7),
    col('BIB', 7),
    ...uciColumn(uci),
    col('Last Name', 18),
    col('First Name', 16),
    col('Country', 8),
    col('Team', 26),
    col('Gender', 8),
    col('Phase', 8),
    col('Heat', 8),
    col('Result', 12),
    col('IRM', 20),
    col('Sort Order', 10),
  ])
  for (const group of race.byCategory) {
    sheet.group(group.name)
    for (const r of group.results) {
      sheet.row([
        r.position,
        numeric(r.startNumber?.value),
        ...uciCell(uci, r.racer.uciId),
        lastName(r.racer),
        firstName(r.racer),
        nat(r.racer),
        clubName(r.racer, uci),
        r.racer.gender,
        '',
        '',
        cleanTime(r.finishTime),
        prettyStatus(race, r),
        r.position,
      ])
    }
  }
  return sheet
}

const SWIM_COLUMNS = [
  col('RB', 5),
  col('SB', 7),
  col('Prezime', 18),
  col('Ime', 16),
  col('Nat', 6),
  col('Spol', 8),
  col('Klub', 26),
  col('Godište', 9),
  col('JRB', 14),
]

function swimCells(r: ExportRace['results'][number]): Cell[] {
  return [
    numeric(r.startNumber?.value),
    lastName(r.racer),
    firstName(r.racer),
    nat(r.racer),
    genderLabel(r.racer),
    clubName(r.racer),
    r.racer.yearOfBirth,
    r.racer.uciId ?? '',
  ]
}

/** Ported from Rails `Race#to_start_list_swim_xlsx`. "RB" is left empty for the organiser to fill in. */
function startListSwim(race: ExportRace) {
  const sheet = new SheetBuilder('Startna lista plivanje', SWIM_COLUMNS)
  for (const group of race.byCategory) {
    sheet.group(group.name)
    for (const r of group.results) sheet.row(['', ...swimCells(r)])
  }
  return sheet
}

/** Ported from Rails `Race#to_start_list_swim_gender_xlsx`: men first, newest registrations first. */
function startListSwimGender(race: ExportRace) {
  const sheet = new SheetBuilder('Startna lista po spolu', SWIM_COLUMNS)
  const groups = [
    { label: 'Muški', gender: GENDER.male },
    { label: 'Ženski', gender: GENDER.female },
  ]
  for (const { label, gender } of groups) {
    sheet.group(label)
    const rows = sortResults(
      race.results.filter((r) => r.racer.gender === gender),
      false,
    )
    for (const r of rows) sheet.row(['', ...swimCells(r)])
  }
  return sheet
}

/** Ported from Rails `Race#to_results_swim_xlsx`. */
function resultsSwim(race: ExportRace) {
  const sheet = new SheetBuilder('Rezultati plivanje', [
    col('PL', 5),
    ...SWIM_COLUMNS.slice(1),
    col('Vrijeme', 12),
  ])
  for (const group of race.byCategory) {
    sheet.group(group.name)
    for (const r of group.results) sheet.row([r.position, ...swimCells(r), cleanTime(r.finishTime)])
  }
  return sheet
}

export const RACE_EXPORTS: Record<RaceExportType, RaceExport> = {
  all: { filename: 'Natjecatelji', build: allData },
  start_list: { filename: 'Startna lista', build: startList },
  results: { filename: 'Rezultati', build: (race) => results(race, false) },
  results_uci: { filename: 'Rezultati UCI', build: (race) => results(race, true) },
  dataride: { filename: 'Rezultati Dataride', build: dataride },
  start_list_swim: { filename: 'Startna lista plivanje', build: startListSwim },
  start_list_swim_gender: { filename: 'Startna lista plivanje po spolu', build: startListSwimGender },
  results_swim: { filename: 'Rezultati plivanje', build: resultsSwim },
}
