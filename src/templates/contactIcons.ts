/** The e-mail, phone, location and link glyphs of the templates that draw their contact lines with icons. */
export type ContactKind = 'mail' | 'phone' | 'pin' | 'info'

export type LinkKind = 'linkedin' | 'github' | 'link'

/** Paths of 24-unit icons: stroked, except those in `FILLED_ICONS`. */
export const CONTACT_ICONS: Record<ContactKind | LinkKind, string> = {
  phone: 'M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  pin: 'M12 21s-6-5.6-6-10.5a6 6 0 0 1 12 0C18 15.4 12 21 12 21zM12 8.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  info: 'M12 11v6M12 7.5v.5M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z',
  // The "in" of a professional network: a dot, a stem and an arch.
  linkedin: 'M7 10v7M7 6.6v.4M11 17v-7M11 13a3 3 0 0 1 6 0v4',
  // GitHub's own mark (Octicon `mark-github`), the one people recognise; it is a filled shape (spec 058).
  github: 'M10.226 17.284c-2.965-.36-5.054-2.493-5.054-5.256 0-1.123.404-2.336 1.078-3.144-.292-.741-.247-2.314.09-2.965.898-.112 2.111.36 2.83 1.01.853-.269 1.752-.404 2.853-.404 1.1 0 1.999.135 2.807.382.696-.629 1.932-1.1 2.83-.988.315.606.36 2.179.067 2.942.72.854 1.101 2 1.101 3.167 0 2.763-2.089 4.852-5.098 5.234.763.494 1.28 1.572 1.28 2.807v2.336c0 .674.561 1.056 1.235.786 4.066-1.55 7.255-5.615 7.255-10.646C23.5 6.188 18.334 1 11.978 1 5.62 1 .5 6.188.5 12.545c0 4.986 3.167 9.12 7.435 10.669.606.225 1.19-.18 1.19-.786V20.63a2.9 2.9 0 0 1-1.078.224c-1.483 0-2.359-.808-2.987-2.313-.247-.607-.517-.966-1.034-1.033-.27-.023-.359-.135-.359-.27 0-.27.45-.471.898-.471.652 0 1.213.404 1.797 1.235.45.651.921.943 1.483.943.561 0 .92-.202 1.437-.719.382-.381.674-.718.944-.943',
  link: 'M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
}

/** Icons drawn as a filled shape rather than a stroke: a template gives their `<path>` the class `filled`. */
export const FILLED_ICONS: ReadonlySet<ContactKind | LinkKind> = new Set(['github'])

/** Which icon a contact line gets: the line is the e-mail, the phone or the location, or something else. */
export function contactKind(text: string, personal: { email: string; phone: string; location: string }): ContactKind {
  return text === personal.email ? 'mail' : text === personal.phone ? 'phone' : text === personal.location ? 'pin' : 'info'
}

/** Which icon a link gets: a known network by its host, otherwise the globe. */
export function linkKind(url: string): LinkKind {
  try {
    const host = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.toLowerCase()
    const is = (domain: string) => host === domain || host.endsWith(`.${domain}`)
    return is('linkedin.com') ? 'linkedin' : is('github.com') ? 'github' : 'link'
  } catch {
    return 'link'
  }
}
