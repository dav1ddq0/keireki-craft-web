/**
 * Countries for the phone field (spec 056): ISO 3166-1 alpha-2 code + international dial code, and
 * the pure helpers to split / join a phone and to guess the country offline. Names come from
 * `Intl.DisplayNames`, so they follow the interface language without a table per language.
 */

export interface Country {
  /** ISO 3166-1 alpha-2, upper case. Also the name of the flag file (lower case). */
  iso: string
  /** Dial code digits, no "+": "34", "1868". */
  dial: string
}

/** `ISO:dial`. Territories that share a code with another country (+1, +7, +44…) stay listed. */
const TABLE =
  'AD:376 AE:971 AF:93 AG:1268 AI:1264 AL:355 AM:374 AO:244 AR:54 AS:1684 AT:43 AU:61 AW:297 AZ:994 ' +
  'BA:387 BB:1246 BD:880 BE:32 BF:226 BG:359 BH:973 BI:257 BJ:229 BL:590 BM:1441 BN:673 BO:591 BQ:599 ' +
  'BR:55 BS:1242 BT:975 BW:267 BY:375 BZ:501 CA:1 CC:61 CD:243 CF:236 CG:242 CH:41 CI:225 CK:682 CL:56 ' +
  'CM:237 CN:86 CO:57 CR:506 CU:53 CV:238 CW:599 CX:61 CY:357 CZ:420 DE:49 DJ:253 DK:45 DM:1767 DO:1809 ' +
  'DZ:213 EC:593 EE:372 EG:20 EH:212 ER:291 ES:34 ET:251 FI:358 FJ:679 FK:500 FM:691 FO:298 FR:33 GA:241 ' +
  'GB:44 GD:1473 GE:995 GF:594 GG:44 GH:233 GI:350 GL:299 GM:220 GN:224 GP:590 GQ:240 GR:30 GT:502 GU:1671 ' +
  'GW:245 GY:592 HK:852 HN:504 HR:385 HT:509 HU:36 ID:62 IE:353 IL:972 IM:44 IN:91 IO:246 IQ:964 IR:98 ' +
  'IS:354 IT:39 JE:44 JM:1876 JO:962 JP:81 KE:254 KG:996 KH:855 KI:686 KM:269 KN:1869 KP:850 KR:82 KW:965 ' +
  'KY:1345 KZ:7 LA:856 LB:961 LC:1758 LI:423 LK:94 LR:231 LS:266 LT:370 LU:352 LV:371 LY:218 MA:212 MC:377 ' +
  'MD:373 ME:382 MF:590 MG:261 MH:692 MK:389 ML:223 MM:95 MN:976 MO:853 MP:1670 MQ:596 MR:222 MS:1664 ' +
  'MT:356 MU:230 MV:960 MW:265 MX:52 MY:60 MZ:258 NA:264 NC:687 NE:227 NF:672 NG:234 NI:505 NL:31 NO:47 ' +
  'NP:977 NR:674 NU:683 NZ:64 OM:968 PA:507 PE:51 PF:689 PG:675 PH:63 PK:92 PL:48 PM:508 PR:1787 PS:970 ' +
  'PT:351 PW:680 PY:595 QA:974 RE:262 RO:40 RS:381 RU:7 RW:250 SA:966 SB:677 SC:248 SD:249 SE:46 SG:65 ' +
  'SH:290 SI:386 SJ:47 SK:421 SL:232 SM:378 SN:221 SO:252 SR:597 SS:211 ST:239 SV:503 SX:1721 SY:963 ' +
  'SZ:268 TC:1649 TD:235 TG:228 TH:66 TJ:992 TK:690 TL:670 TM:993 TN:216 TO:676 TR:90 TT:1868 TV:688 ' +
  'TW:886 TZ:255 UA:380 UG:256 US:1 UY:598 UZ:998 VA:379 VC:1784 VE:58 VG:1284 VI:1340 VN:84 VU:678 ' +
  'WF:681 WS:685 XK:383 YE:967 YT:262 ZA:27 ZM:260 ZW:263'

export const COUNTRIES: readonly Country[] = TABLE.split(' ').map((entry) => {
  const [iso, dial] = entry.split(':')
  return { iso, dial }
})

/** Which country a dial code means when several share it ("+1" is the US, not Canada). */
const PRIMARY: Record<string, string> = {
  '1': 'US',
  '7': 'RU',
  '39': 'IT',
  '44': 'GB',
  '47': 'NO',
  '61': 'AU',
  '212': 'MA',
  '262': 'RE',
  '590': 'GP',
  '599': 'CW',
}

const byIso = new Map(COUNTRIES.map((c) => [c.iso, c]))
const byDial = new Map<string, Country>()
for (const country of COUNTRIES) {
  const current = byDial.get(country.dial)
  if (!current || PRIMARY[country.dial] === country.iso) byDial.set(country.dial, country)
}
const MAX_DIAL_DIGITS = Math.max(...COUNTRIES.map((c) => c.dial.length))

export function countryByIso(iso: string | null | undefined): Country | undefined {
  return iso ? byIso.get(iso.toUpperCase()) : undefined
}

/** The country name in the given interface language ("España", "Spain"); the code if unsupported. */
export function countryName(iso: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(iso) ?? iso
  } catch {
    return iso
  }
}

export interface SplitPhone {
  /** The country whose dial code starts the phone, or null when it has none. */
  country: Country | null
  /** What follows the code, as typed. The whole text when there is no known code. */
  number: string
}

/** Splits "+34 600 123 456" into Spain and "600 123 456". Text without a leading "+" is all number. */
export function splitPhone(value: string): SplitPhone {
  const text = value.trim()
  if (!text.startsWith('+')) return { country: null, number: text }
  const digits = text.replace(/\D/g, '')
  for (let len = Math.min(MAX_DIAL_DIGITS, digits.length); len >= 1; len--) {
    const country = byDial.get(digits.slice(0, len))
    if (!country) continue
    // Cut the original text after `len` digits, so the number keeps the user's spacing.
    let seen = 0
    let cut = 1
    while (cut < text.length && seen < len) {
      if (/\d/.test(text[cut])) seen++
      cut++
    }
    return { country, number: text.slice(cut).replace(/^[\s\-.()]+/, '') }
  }
  return { country: null, number: text }
}

/** "+34 600 123 456" from Spain and "600 123 456". An empty number stays empty: no lone "+34". */
export function joinPhone(country: Country | null, number: string): string {
  const rest = number.trim()
  if (!rest) return ''
  return country ? `+${country.dial} ${rest}` : rest
}

/** Time zones whose country is not the one a language would suggest (a coarse, offline guess). */
const ZONE_COUNTRY: Record<string, string> = {
  'Europe/Madrid': 'ES', 'Atlantic/Canary': 'ES', 'Europe/Lisbon': 'PT', 'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE', 'Europe/Rome': 'IT', 'Europe/London': 'GB', 'Europe/Dublin': 'IE',
  'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE', 'Europe/Zurich': 'CH', 'Europe/Vienna': 'AT',
  'Europe/Warsaw': 'PL', 'Europe/Stockholm': 'SE', 'Europe/Oslo': 'NO', 'Europe/Copenhagen': 'DK',
  'Europe/Helsinki': 'FI', 'Europe/Athens': 'GR', 'Europe/Istanbul': 'TR', 'Europe/Kiev': 'UA',
  'Europe/Kyiv': 'UA', 'Europe/Moscow': 'RU', 'America/Mexico_City': 'MX', 'America/Bogota': 'CO',
  'America/Lima': 'PE', 'America/Santiago': 'CL', 'America/Caracas': 'VE', 'America/Guayaquil': 'EC',
  'America/La_Paz': 'BO', 'America/Montevideo': 'UY', 'America/Asuncion': 'PY', 'America/Havana': 'CU',
  'America/Panama': 'PA', 'America/Costa_Rica': 'CR', 'America/Guatemala': 'GT', 'America/Santo_Domingo': 'DO',
  'America/Argentina/Buenos_Aires': 'AR', 'America/Buenos_Aires': 'AR', 'America/Sao_Paulo': 'BR',
  'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/New_York': 'US', 'America/Chicago': 'US',
  'America/Denver': 'US', 'America/Los_Angeles': 'US', 'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR',
  'Asia/Shanghai': 'CN', 'Asia/Hong_Kong': 'HK', 'Asia/Singapore': 'SG', 'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN', 'Asia/Dubai': 'AE', 'Asia/Jakarta': 'ID', 'Asia/Manila': 'PH',
  'Asia/Bangkok': 'TH', 'Asia/Ho_Chi_Minh': 'VN', 'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU',
  'Pacific/Auckland': 'NZ', 'Africa/Johannesburg': 'ZA', 'Africa/Cairo': 'EG', 'Africa/Lagos': 'NG',
  'Africa/Casablanca': 'MA',
}

/**
 * The country to start from, with no network: the region in the browser language ("es-MX" → MX),
 * else the time zone, else the region that language most likely belongs to ("es" → ES).
 * Null when nothing in the list matches.
 */
export function countryFromLocale(language: string, timeZone: string): Country | null {
  let region: string | undefined
  try {
    const locale = new Intl.Locale(language)
    region = locale.region
    if (region && byIso.has(region)) return byIso.get(region) ?? null
    const zone = ZONE_COUNTRY[timeZone]
    if (zone && byIso.has(zone)) return byIso.get(zone) ?? null
    const likely = locale.maximize().region
    return likely ? (byIso.get(likely) ?? null) : null
  } catch {
    const zone = ZONE_COUNTRY[timeZone]
    return zone ? (byIso.get(zone) ?? null) : null
  }
}
