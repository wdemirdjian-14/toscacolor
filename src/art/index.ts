import { UNICORN_PAGES, type Coloring } from './unicorns'

export type { Coloring, Level } from './unicorns'

export interface Theme {
  id: string
  name: string
  /** Teinte de la vignette du theme. */
  accent: string
  pages: Coloring[]
  soon?: boolean
}

/**
 * Les themes a venir sont volontairement generiques : pas de personnage sous
 * licence, la bibliotheque reste la notre.
 */
export const THEMES: Theme[] = [
  { id: 'licornes', name: 'Licornes', accent: '#E4335A', pages: UNICORN_PAGES },
  { id: 'animaux', name: 'Animaux mignons', accent: '#F0A93C', pages: [], soon: true },
  { id: 'ocean', name: 'Sirènes & océan', accent: '#2E86C8', pages: [], soon: true },
  { id: 'heros', name: 'Super-héros', accent: '#7B4FC0', pages: [], soon: true },
  { id: 'dinos', name: 'Dinosaures', accent: '#4CAF6E', pages: [], soon: true },
  { id: 'chateaux', name: 'Princesses & châteaux', accent: '#D96BA0', pages: [], soon: true },
]

export function findPage(themeId: string, pageId: string) {
  const theme = THEMES.find((t) => t.id === themeId)
  return { theme, page: theme?.pages.find((p) => p.id === pageId) }
}
