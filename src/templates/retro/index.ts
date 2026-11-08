import type { TemplateDefinition } from '@/types/template'
import thumbnail from './thumbnail'

const definition: TemplateDefinition = {
  id: 'retro',
  name: 'Retro',
  descriptionKey: 'templates.retro.description',
  thumbnail,
  supports: ['photo', 'sidebar', 'accentColor', 'customFont', 'multiPage', 'skillLevels'],
  defaults: {
    accentColor: '#8be0d4',
    fontFamily: "'Montserrat', 'Segoe UI', system-ui, sans-serif",
  },
  palette: ['#8be0d4', '#f6c85f', '#f4a6a6', '#a7c7e7', '#c3b1e1', '#b5d99c', '#ffb17a', '#2a9d8f', '#8a8f98'],
  tags: ['tags.twoColumn', 'tags.photo', 'tags.bold'],
  component: () => import('./Template.vue').then((m) => m.default),
}

export default definition
