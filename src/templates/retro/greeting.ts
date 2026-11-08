/**
 * The greeting over the name in Retro's header (spec 080), in the CV's language. Basque says it after
 * the name ("… naiz"), so it greets alone.
 */
const GREETINGS: Record<string, string> = {
  es: '¡Hola! Soy',
  en: "Hello! I'm",
  fr: 'Bonjour ! Je suis',
  it: 'Ciao! Sono',
  pt: 'Olá! Sou',
  de: 'Hallo! Ich bin',
  ca: 'Hola! Soc',
  'ca-valencia': 'Hola! Sóc',
  eu: 'Kaixo!',
}

export function greeting(language: string): string {
  return GREETINGS[language] ?? GREETINGS.es!
}
