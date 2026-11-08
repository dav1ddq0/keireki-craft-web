/**
 * The two characters in a skill's circle (spec 083): the first letter of its first two words, or the
 * first two of a single word ("Adobe Illustrator" → "AI", "Photoshop" → "Ph", "Vue 3" → "V3").
 * Letters and digits of any script count; signs ("C++") are skipped, and so is a short lowercase word
 * after the first, which is a joining word ("Gestión de proyectos" → "GP") or a suffix ("Node.js").
 */
export function initials(name: string): string {
  const [first, ...rest] = (name.match(/[\p{L}\p{N}]+/gu) ?? []).map((word) => Array.from(word))
  if (!first) return ''
  const second = rest.find((word) => !(word.length <= 3 && word.join('') === word.join('').toLocaleLowerCase() && /\p{Ll}/u.test(word.join(''))))
  const lead = first[0]!.toLocaleUpperCase()
  if (second) return lead + second[0]!.toLocaleUpperCase()
  return lead + (first[1] ?? '')
}
