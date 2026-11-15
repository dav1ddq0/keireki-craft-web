/**
 * The search of My CVs (spec 018, 089): case- and accent-insensitive, and able to say which letters
 * matched, as they are written.
 */

export interface TextPart {
  text: string
  match: boolean
}

export const foldText = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/** True when the folded query is in the folded text; an empty query matches everything. */
export const matchesQuery = (text: string, query: string) => foldText(text).includes(foldText(query.trim()))

/**
 * Splits `text` into runs that match the query and runs that don't, keeping the original letters:
 * "martin" over "Nadia Martín" gives "Nadia ", then "Martín" marked. It folds code point by code
 * point and remembers where each folded letter came from, since a fold can change the length.
 */
export function highlightParts(text: string, query: string): TextPart[] {
  const q = foldText(query.trim())
  if (!text) return []
  if (!q) return [{ text, match: false }]

  const letters = Array.from(text)
  let folded = ''
  const origin: number[] = []
  letters.forEach((letter, index) => {
    for (const unit of foldText(letter)) {
      folded += unit
      for (let i = 0; i < unit.length; i++) origin.push(index)
    }
  })

  const hit = new Array<boolean>(letters.length).fill(false)
  for (let at = folded.indexOf(q); at !== -1; at = folded.indexOf(q, at + q.length)) {
    for (let i = at; i < at + q.length; i++) hit[origin[i]!] = true
  }
  // A mark written apart (an accent after its letter, NFD) folds to nothing: it goes with its letter.
  letters.forEach((letter, index) => {
    if (index > 0 && !foldText(letter)) hit[index] = hit[index - 1]!
  })

  const parts: TextPart[] = []
  letters.forEach((letter, index) => {
    const last = parts[parts.length - 1]
    if (last && last.match === hit[index]) last.text += letter
    else parts.push({ text: letter, match: hit[index]! })
  })
  return parts
}
