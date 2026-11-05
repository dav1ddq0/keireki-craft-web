import type { TemplateDefinition } from '@/types/template'
import thumbnail from './thumbnail'

const definition: TemplateDefinition = {
  id: 'amber',
  name: 'Amber',
  descriptionKey: 'templates.amber.description',
  thumbnail,
  supports: ['photo', 'sidebar', 'accentColor', 'customFont', 'multiPage', 'skillLevels'],
  defaults: {
    accentColor: '#e8a200',
    fontFamily: "'Raleway', 'Segoe UI', system-ui, sans-serif",
  },
  palette: ['#e8a200', '#f2c230', '#e2711d', '#d1495b', '#2a9d8f', '#3d7dca', '#7b5ea7', '#5b8c3a', '#8a8f98'],
  tags: ['tags.twoColumn', 'tags.photo', 'tags.bold'],
  component: () => import('./Template.vue').then((m) => m.default),
}

export default definition
