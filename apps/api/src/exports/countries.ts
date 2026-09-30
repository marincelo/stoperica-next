/** ISO 3166 alpha-2 → IOC code, as the Rails `countries` gem printed in the "Nat" column. */
const IOC: Record<string, string> = {
  AD: 'AND', AE: 'UAE', AL: 'ALB', AM: 'ARM', AR: 'ARG', AT: 'AUT', AU: 'AUS', AZ: 'AZE', BA: 'BIH', BE: 'BEL',
  BG: 'BUL', BR: 'BRA', BY: 'BLR', CA: 'CAN', CH: 'SUI', CL: 'CHI', CN: 'CHN', CO: 'COL', CR: 'CRC', CU: 'CUB',
  CY: 'CYP', CZ: 'CZE', DE: 'GER', DK: 'DEN', DZ: 'ALG', EC: 'ECU', EE: 'EST', EG: 'EGY', ER: 'ERI', ES: 'ESP',
  ET: 'ETH', FI: 'FIN', FR: 'FRA', GB: 'GBR', GD: 'GRN', GE: 'GEO', GR: 'GRE', HK: 'HKG', HR: 'CRO', HU: 'HUN',
  ID: 'INA', IE: 'IRL', IL: 'ISR', IN: 'IND', IR: 'IRI', IS: 'ISL', IT: 'ITA', JM: 'JAM', JP: 'JPN', KE: 'KEN',
  KR: 'KOR', KZ: 'KAZ', LI: 'LIE', LT: 'LTU', LU: 'LUX', LV: 'LAT', MA: 'MAR', MC: 'MON', MD: 'MDA', ME: 'MNE',
  MK: 'MKD', MT: 'MLT', MX: 'MEX', MY: 'MAS', NG: 'NGR', NL: 'NED', NO: 'NOR', NP: 'NEP', NZ: 'NZL', PA: 'PAN',
  PE: 'PER', PH: 'PHI', PL: 'POL', PR: 'PUR', PT: 'POR', RO: 'ROU', RS: 'SRB', RU: 'RUS', SA: 'KSA', SE: 'SWE',
  SG: 'SGP', SI: 'SLO', SK: 'SVK', SM: 'SMR', TH: 'THA', TN: 'TUN', TR: 'TUR', TW: 'TPE', UA: 'UKR', US: 'USA',
  UY: 'URU', VE: 'VEN', VN: 'VIE', XK: 'KOS', ZA: 'RSA',
}

const names = new Intl.DisplayNames(['en'], { type: 'region' })

export function iocCode(country: string | null): string {
  if (!country) return ''
  const code = country.toUpperCase()
  return IOC[code] ?? code
}

export function countryName(country: string | null): string {
  if (!country) return ''
  try {
    return names.of(country.toUpperCase()) ?? country
  } catch {
    return country
  }
}
