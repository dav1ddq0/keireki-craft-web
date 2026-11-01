import type { CVData } from '@/types/cv'
import type { Locale } from '@/i18n'
import {
  createCustomEntry,
  createCustomSection,
  createEducation,
  createEmptyCV,
  createExperience,
  createLanguage,
  createLink,
  createSkillGroup,
} from './factory'

interface SampleJob {
  position: string
  company: string
  location: string
  description: string
  highlights: string[]
}

/** Everything of the sample that is written in a language; dates, skills and levels are shared. */
interface SampleText {
  title: string
  fullName: string
  headline: string
  email: string
  phone: string
  location: string
  /** The handle of the LinkedIn and GitHub links. */
  handle: string
  summary: string
  jobs: [SampleJob, SampleJob]
  degree: string
  institution: string
  city: string
  degreeNote: string
  skillGroups: [string, string, string]
  modernCss: string
  /** Mother tongue first, then a C1 and a B1. */
  languages: [[string, string], [string, string], [string, string]]
  talksTitle: string
  talk: { title: string; subtitle: string; description: string }
}

/**
 * One person per interface language (spec 059), each local to a country: name, city, university,
 * phone format. Phones are made up (where a country reserves numbers for fiction, from that range)
 * and e-mails are at example.com. Spanish is the original sample, unchanged.
 */
const SAMPLES: Record<Locale, SampleText> = {
  es: {
    title: 'CV de ejemplo',
    fullName: 'Nadia Martín Reyes',
    headline: 'Desarrolladora Full-Stack',
    email: 'nadia.martin@example.com',
    phone: '+34 600 123 456',
    location: 'Valencia, España',
    handle: 'nadiamartin',
    summary:
      'Desarrolladora full-stack con seis años construyendo productos web en equipos pequeños. ' +
      'Trabajo sobre todo con TypeScript y Python, y disfruto de la parte donde el producto y la ' +
      'infraestructura se tocan. Busco un equipo que se tome en serio la calidad del código.',
    jobs: [
      {
        position: 'Desarrolladora Senior',
        company: 'Cartograf',
        location: 'Remoto',
        description: 'Plataforma de análisis geoespacial para administraciones públicas.',
        highlights: [
          'Reduje el tiempo de carga del visor de mapas de 4,2 s a 1,1 s reescribiendo la capa de teselado.',
          'Diseñé la migración a un monorepo que dejó el despliegue en un solo comando.',
          'Mentoricé a dos personas junior hasta llevar features a producción de forma autónoma.',
        ],
      },
      {
        position: 'Desarrolladora Full-Stack',
        company: 'Estudio Nube',
        location: 'Valencia',
        description: 'Agencia de producto digital: seis proyectos de cliente de principio a fin.',
        highlights: [
          'Construí el sistema de diseño compartido que usaron cuatro proyectos simultáneos.',
          'Automaticé el pipeline de QA visual y corté las regresiones de maquetación a la mitad.',
        ],
      },
    ],
    degree: 'Grado en Ingeniería Informática',
    institution: 'Universitat Politècnica de València',
    city: 'Valencia',
    degreeNote: 'Mención en Ingeniería del Software. Proyecto final sobre visualización de datos.',
    skillGroups: ['Lenguajes', 'Frontend', 'Backend'],
    modernCss: 'CSS moderno',
    languages: [['Español', 'Nativo'], ['Inglés', 'C1'], ['Francés', 'B1']],
    talksTitle: 'Charlas',
    talk: {
      title: 'Renderizar mapas sin morir en el intento',
      subtitle: 'ValenciaJS',
      description: 'Sobre presupuestos de rendimiento en visores de datos geoespaciales.',
    },
  },
  en: {
    title: 'Sample CV',
    fullName: 'Emma Clarke',
    headline: 'Full-Stack Developer',
    email: 'emma.clarke@example.com',
    // Ofcom keeps 07700 900000–900999 for drama.
    phone: '+44 7700 900123',
    location: 'Manchester, United Kingdom',
    handle: 'emmaclarke',
    summary:
      'Full-stack developer with six years building web products in small teams. ' +
      'I work mostly with TypeScript and Python, and I enjoy the part where product and ' +
      'infrastructure meet. Looking for a team that takes code quality seriously.',
    jobs: [
      {
        position: 'Senior Developer',
        company: 'Mapwright',
        location: 'Remote',
        description: 'Geospatial analytics platform for public bodies.',
        highlights: [
          'Cut the map viewer’s load time from 4.2 s to 1.1 s by rewriting the tiling layer.',
          'Designed the move to a monorepo that brought deployment down to a single command.',
          'Mentored two junior developers until they shipped features to production on their own.',
        ],
      },
      {
        position: 'Full-Stack Developer',
        company: 'Northfield Studio',
        location: 'Manchester',
        description: 'Digital product agency: six client projects from start to finish.',
        highlights: [
          'Built the shared design system used by four projects at once.',
          'Automated the visual QA pipeline and halved layout regressions.',
        ],
      },
    ],
    degree: 'BSc in Computer Science',
    institution: 'The University of Manchester',
    city: 'Manchester',
    degreeNote: 'First-class honours. Final-year project on data visualisation.',
    // Not "Languages": that is the heading of the languages section, and an import reads it as one.
    skillGroups: ['Programming languages', 'Frontend', 'Backend'],
    modernCss: 'Modern CSS',
    languages: [['English', 'Native'], ['Spanish', 'C1'], ['French', 'B1']],
    talksTitle: 'Talks',
    talk: {
      title: 'Rendering maps without losing your mind',
      subtitle: 'Manchester JS',
      description: 'On performance budgets in geospatial data viewers.',
    },
  },
  fr: {
    title: 'Exemple de CV',
    fullName: 'Claire Dubois',
    headline: 'Développeuse full-stack',
    email: 'claire.dubois@example.com',
    // The ARCEP keeps 01 99 00 00 00 – 01 99 99 99 99 for fiction.
    phone: '+33 1 99 00 12 34',
    location: 'Lyon, France',
    handle: 'clairedubois',
    summary:
      'Développeuse full-stack, six ans d’expérience dans la création de produits web au sein de petites équipes. ' +
      'Je travaille surtout avec TypeScript et Python, et j’aime le moment où le produit rencontre ' +
      'l’infrastructure. Je cherche une équipe qui prend au sérieux la qualité du code.',
    jobs: [
      {
        position: 'Développeuse senior',
        company: 'Cartographe',
        location: 'Télétravail',
        description: 'Plateforme d’analyse géospatiale pour les administrations publiques.',
        highlights: [
          'Réduit le temps de chargement de la visionneuse de cartes de 4,2 s à 1,1 s en réécrivant la couche de tuiles.',
          'Conçu la migration vers un monorepo qui a ramené le déploiement à une seule commande.',
          'Accompagné deux profils juniors jusqu’à ce qu’ils livrent des fonctionnalités en autonomie.',
        ],
      },
      {
        position: 'Développeuse full-stack',
        company: 'Studio Nuage',
        location: 'Lyon',
        description: 'Agence de produits numériques : six projets clients de bout en bout.',
        highlights: [
          'Construit le système de design partagé par quatre projets simultanés.',
          'Automatisé la chaîne de QA visuelle et divisé par deux les régressions de mise en page.',
        ],
      },
    ],
    degree: 'Diplôme d’ingénieur en informatique',
    institution: 'INSA Lyon',
    city: 'Lyon',
    degreeNote: 'Spécialité génie logiciel. Projet de fin d’études sur la visualisation de données.',
    skillGroups: ['Langages', 'Frontend', 'Backend'],
    modernCss: 'CSS moderne',
    languages: [['Français', 'Langue maternelle'], ['Anglais', 'C1'], ['Espagnol', 'B1']],
    talksTitle: 'Conférences',
    talk: {
      title: 'Afficher des cartes sans y laisser sa santé',
      subtitle: 'LyonJS',
      description: 'Sur les budgets de performance des visionneuses de données géospatiales.',
    },
  },
  it: {
    title: 'CV di esempio',
    fullName: 'Giulia Ferri',
    headline: 'Sviluppatrice full-stack',
    email: 'giulia.ferri@example.com',
    phone: '+39 051 000 1234',
    location: 'Bologna, Italia',
    handle: 'giuliaferri',
    summary:
      'Sviluppatrice full-stack con sei anni di esperienza nella realizzazione di prodotti web in piccoli team. ' +
      'Lavoro soprattutto con TypeScript e Python e mi appassiona il punto in cui prodotto e ' +
      'infrastruttura si incontrano. Cerco un team che prenda sul serio la qualità del codice.',
    jobs: [
      {
        position: 'Sviluppatrice senior',
        company: 'Cartografo',
        location: 'Da remoto',
        description: 'Piattaforma di analisi geospaziale per la pubblica amministrazione.',
        highlights: [
          'Ridotto il tempo di caricamento del visualizzatore di mappe da 4,2 s a 1,1 s riscrivendo il livello delle tile.',
          'Progettato il passaggio a un monorepo che ha ridotto il rilascio a un solo comando.',
          'Seguito due profili junior fino a portare funzionalità in produzione in autonomia.',
        ],
      },
      {
        position: 'Sviluppatrice full-stack',
        company: 'Studio Nuvola',
        location: 'Bologna',
        description: 'Agenzia di prodotti digitali: sei progetti per clienti dall’inizio alla fine.',
        highlights: [
          'Realizzato il design system condiviso da quattro progetti in parallelo.',
          'Automatizzato la pipeline di QA visiva e dimezzato le regressioni di layout.',
        ],
      },
    ],
    degree: 'Laurea in Ingegneria Informatica',
    institution: 'Università di Bologna',
    city: 'Bologna',
    degreeNote: 'Indirizzo ingegneria del software. Tesi sulla visualizzazione dei dati.',
    skillGroups: ['Linguaggi', 'Frontend', 'Backend'],
    modernCss: 'CSS moderno',
    languages: [['Italiano', 'Madrelingua'], ['Inglese', 'C1'], ['Spagnolo', 'B1']],
    talksTitle: 'Interventi',
    talk: {
      title: 'Disegnare mappe senza perdere la testa',
      subtitle: 'BolognaJS',
      description: 'Sui budget di prestazioni nei visualizzatori di dati geospaziali.',
    },
  },
  pt: {
    title: 'CV de exemplo',
    fullName: 'Inês Carvalho',
    headline: 'Programadora full-stack',
    email: 'ines.carvalho@example.com',
    phone: '+351 22 000 0123',
    location: 'Porto, Portugal',
    handle: 'inescarvalho',
    summary:
      'Programadora full-stack com seis anos a construir produtos web em equipas pequenas. ' +
      'Trabalho sobretudo com TypeScript e Python e gosto da parte em que o produto e a ' +
      'infraestrutura se cruzam. Procuro uma equipa que leve a sério a qualidade do código.',
    jobs: [
      {
        position: 'Programadora sénior',
        company: 'Cartógrafo',
        location: 'Remoto',
        description: 'Plataforma de análise geoespacial para a administração pública.',
        highlights: [
          'Reduzi o tempo de carregamento do visualizador de mapas de 4,2 s para 1,1 s ao reescrever a camada de mosaicos.',
          'Desenhei a migração para um monorepo que reduziu a implementação a um único comando.',
          'Acompanhei duas pessoas júnior até levarem funcionalidades para produção de forma autónoma.',
        ],
      },
      {
        position: 'Programadora full-stack',
        company: 'Estúdio Nuvem',
        location: 'Porto',
        description: 'Agência de produto digital: seis projetos de clientes do início ao fim.',
        highlights: [
          'Construí o sistema de design partilhado por quatro projetos em simultâneo.',
          'Automatizei o pipeline de QA visual e reduzi para metade as regressões de layout.',
        ],
      },
    ],
    degree: 'Licenciatura em Engenharia Informática',
    institution: 'Universidade do Porto',
    city: 'Porto',
    degreeNote: 'Ramo de engenharia de software. Projeto final sobre visualização de dados.',
    skillGroups: ['Linguagens', 'Frontend', 'Backend'],
    modernCss: 'CSS moderno',
    languages: [['Português', 'Nativo'], ['Inglês', 'C1'], ['Espanhol', 'B1']],
    talksTitle: 'Palestras',
    talk: {
      title: 'Renderizar mapas sem perder a cabeça',
      subtitle: 'Porto Codes',
      description: 'Sobre orçamentos de desempenho em visualizadores de dados geoespaciais.',
    },
  },
  de: {
    title: 'Beispiel-Lebenslauf',
    fullName: 'Lena Schneider',
    headline: 'Full-Stack-Entwicklerin',
    email: 'lena.schneider@example.com',
    // No German number starts with 0 after the area code: this one cannot ring anyone.
    phone: '+49 89 0001 2345',
    location: 'München, Deutschland',
    handle: 'lenaschneider',
    summary:
      'Full-Stack-Entwicklerin mit sechs Jahren Erfahrung in der Entwicklung von Webprodukten in kleinen Teams. ' +
      'Ich arbeite vor allem mit TypeScript und Python und mag die Stelle, an der Produkt und ' +
      'Infrastruktur zusammenkommen. Ich suche ein Team, das Codequalität ernst nimmt.',
    jobs: [
      {
        position: 'Senior-Entwicklerin',
        company: 'Kartograf',
        location: 'Remote',
        description: 'Plattform für Geodatenanalyse für öffentliche Verwaltungen.',
        highlights: [
          'Ladezeit des Kartenviewers durch Neuschreiben der Kachelebene von 4,2 s auf 1,1 s gesenkt.',
          'Umstieg auf ein Monorepo konzipiert, das das Deployment auf einen einzigen Befehl reduziert hat.',
          'Zwei Junior-Entwickler begleitet, bis sie Features eigenständig in Produktion gebracht haben.',
        ],
      },
      {
        position: 'Full-Stack-Entwicklerin',
        company: 'Studio Wolke',
        location: 'München',
        description: 'Agentur für digitale Produkte: sechs Kundenprojekte von Anfang bis Ende.',
        highlights: [
          'Das gemeinsame Designsystem aufgebaut, das vier Projekte gleichzeitig genutzt haben.',
          'Die visuelle QA-Pipeline automatisiert und Layout-Regressionen halbiert.',
        ],
      },
    ],
    degree: 'B.Sc. Informatik',
    institution: 'Technische Universität München',
    city: 'München',
    degreeNote: 'Schwerpunkt Softwaretechnik. Abschlussarbeit über Datenvisualisierung.',
    skillGroups: ['Programmiersprachen', 'Frontend', 'Backend'],
    modernCss: 'Modernes CSS',
    languages: [['Deutsch', 'Muttersprache'], ['Englisch', 'C1'], ['Spanisch', 'B1']],
    talksTitle: 'Vorträge',
    talk: {
      title: 'Karten rendern, ohne den Verstand zu verlieren',
      subtitle: 'MunichJS',
      description: 'Über Performance-Budgets in Viewern für Geodaten.',
    },
  },
}

/**
 * Sample content, loaded on demand from the toolbar (never silently): it lets
 * someone see a finished CV in every template before typing anything, and it
 * exercises each section — including a custom one — for template development.
 * It is written in the interface language, and so is the CV (spec 059).
 */
export function createSampleCV(locale: Locale = 'es'): CVData {
  const text = SAMPLES[locale]
  const cv = createEmptyCV()
  cv.meta.title = text.title
  cv.meta.language = locale

  cv.personal = {
    ...cv.personal,
    fullName: text.fullName,
    headline: text.headline,
    email: text.email,
    phone: text.phone,
    location: text.location,
    links: [
      { ...createLink(), label: 'LinkedIn', url: `linkedin.com/in/${text.handle}` },
      { ...createLink(), label: 'GitHub', url: `github.com/${text.handle}` },
    ],
  }

  cv.summary = text.summary

  const [recent, previous] = text.jobs
  cv.experience = [
    { ...createExperience(), ...recent, startDate: '2022-03', endDate: null, highlights: [...recent.highlights] },
    { ...createExperience(), ...previous, startDate: '2019-09', endDate: '2022-02', highlights: [...previous.highlights] },
  ]

  cv.education = [
    {
      ...createEducation(),
      degree: text.degree,
      institution: text.institution,
      location: text.city,
      startDate: '2014-09',
      endDate: '2018-06',
      description: text.degreeNote,
    },
  ]

  const [languagesGroup, frontendGroup, backendGroup] = text.skillGroups
  cv.skills = [
    { ...createSkillGroup(), category: languagesGroup, items: [
        { name: 'TypeScript', level: 5 },
        { name: 'Python', level: 4 },
        { name: 'Go', level: 3 },
        { name: 'SQL', level: 4 },
      ] },
    { ...createSkillGroup(), category: frontendGroup, items: ['Vue 3', 'React', 'Vite', text.modernCss].map((name) => ({ name })) },
    { ...createSkillGroup(), category: backendGroup, items: ['FastAPI', 'PostgreSQL', 'Redis', 'Docker'].map((name) => ({ name })) },
  ]

  cv.languages = text.languages.map(([name, level]) => ({ ...createLanguage(), name, level }))

  const talks = createCustomSection(text.talksTitle)
  talks.entries = [{ ...createCustomEntry(), ...text.talk, date: '2024' }]
  cv.customSections = [talks]
  cv.sectionOrder = [...cv.sectionOrder, talks.id]

  return cv
}
