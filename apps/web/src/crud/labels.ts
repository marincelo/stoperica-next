/**
 * Croatian field labels. Keys are either `Model.field` (model-specific) or `field` (shared).
 * Fields without an entry fall back to a humanized field name.
 */
export const fieldLabels: Record<string, string> = {
  id: 'ID',
  name: 'Naziv',
  email: 'E-mail',
  createdAt: 'Kreirano',
  updatedAt: 'Ažurirano',
  hidden: 'Skriveno',

  'Race.date': 'Datum',
  'Race.laps': 'Broj krugova',
  'Race.easyLaps': 'Broj krugova (lakša staza)',
  'Race.startedAt': 'Početak',
  'Race.endedAt': 'Završetak',
  'Race.descriptionUrl': 'URL opisa',
  'Race.descriptionText': 'Opis',
  'Race.registrationThreshold': 'Rok prijave',
  'Race.emailBody': 'Tekst e-maila',
  'Race.lockRaceResults': 'Zaključani rezultati',
  'Race.sendEmail': 'Slanje e-maila',
  'Race.uciDisplay': 'Prikaz UCI',
  'Race.raceType': 'Vrsta utrke',
  'Race.poolId': 'Bazen startnih brojeva',
  'Race.leagueId': 'Liga',
  'Race.controlPoints': 'Kontrolne točke',
  'Race.pictureUrl': 'URL slike',
  'Race.locationUrl': 'URL lokacije',
  'Race.pointsMultiplier': 'Množitelj bodova',
  'Race.millisDisplay': 'Prikaz milisekundi',
  'Race.authToken': 'Auth token',
  'Race.skipAuth': 'Preskoči autentikaciju',
}

export function humanize(name: string): string {
  const words = name
    .replace(/Id$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function fieldLabel(model: string, field: string): string {
  return fieldLabels[`${model}.${field}`] ?? fieldLabels[field] ?? humanize(field)
}
