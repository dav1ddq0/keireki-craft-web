import type { TemplateDefinition } from '@/types/template'
import thumbnail from './thumbnail'

const definition: TemplateDefinition = {
  id: 'minimalist',
  name: 'Minimalist',
  descriptionKey: 'templates.minimalist.description',
  thumbnail,
  supports: ['photo', 'sidebar', 'accentColor', 'customFont', 'multiPage', 'skillLevels'],
  defaults: {
    accentColor: '#c98b84',
    fontFamily: "'Raleway', 'Segoe UI', system-ui, sans-serif",
  },
  palette: ['#c98b84', '#f4a6a6', '#c3b1e1', '#b5d99c', '#a7c7e7', '#b9a273', '#8be0d4', '#5b7285', '#1f4e79'],
  tags: ['tags.twoColumn', 'tags.photo', 'tags.minimal'],
  component: () => import('./Template.vue').then((m) => m.default),
}

export default definition
