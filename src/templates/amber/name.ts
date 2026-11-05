/**
 * The name split for Amber's header: everything but the last word in ink, the last word in the
 * accent (spec 071). A one-word name has no accented part.
 */
export function splitName(fullName: string): { lead: string; last: string } {
  const words = fullName.trim().split(/\s+/).filter(Boolean)
  if (words.length < 2) return { lead: words[0] ?? '', last: '' }
  return { lead: words.slice(0, -1).join(' '), last: words[words.length - 1]! }
}
