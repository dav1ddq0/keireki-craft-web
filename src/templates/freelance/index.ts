import type { TemplateDefinition } from '@/types/template'
import thumbnail from './thumbnail'

const definition: TemplateDefinition = {
  id: 'freelance',
  name: 'Freelance',
  descriptionKey: 'templates.freelance.description',
  thumbnail,
  supports: ['photo', 'sidebar', 'accentColor', 'customFont', 'multiPage', 'skillLevels'],
  defaults: {
    accentColor: '#ff6b61',
    fontFamily: "'Work Sans', 'Segoe UI', system-ui, sans-serif",
  },
  palette: ['#ff6b61', '#f4a6a6', '#ffb17a', '#f6c85f', '#8be0d4', '#a7c7e7', '#c3b1e1', '#334fdc', '#1f4e79'],
  tags: ['tags.twoColumn', 'tags.photo', 'tags.bold'],
  component: () => import('./Template.vue').then((m) => m.default),
}

export default definition
