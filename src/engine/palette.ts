import type { EffectId } from './effects'

export interface Swatch {
  hex: string
  name: string
  /** Une couleur spéciale : le remplissage reçoit en plus un semis de paillettes. */
  effect?: EffectId
}

/**
 * Les paillettes viennent en tête : c'est ce qu'un enfant cherche en premier,
 * et la rangée défile, donc ce qui est au début est ce qui est le plus accessible.
 */
export const SPECIALS: Swatch[] = [
  { hex: '#FF7BB5', name: 'paillettes roses', effect: 'paillettes' },
  { hex: '#E8B33C', name: 'paillettes dorées', effect: 'paillettes' },
  { hex: '#59B8E8', name: 'paillettes bleues', effect: 'paillettes' },
  { hex: '#A56BE0', name: 'paillettes violettes', effect: 'paillettes' },
  { hex: '#B9BCC9', name: 'paillettes argentées', effect: 'paillettes' },
  { hex: '#57C08A', name: 'paillettes vertes', effect: 'paillettes' },
]

/** 24 couleurs unies, rangées par familles pour qu'un enfant les retrouve. */
export const PLAIN: Swatch[] = [
  { hex: '#FFD9E4', name: 'rose poudré' },
  { hex: '#FF8FB1', name: 'rose bonbon' },
  { hex: '#E4335A', name: 'rouge fraise' },
  { hex: '#9E1B4A', name: 'framboise' },
  { hex: '#FFC98B', name: 'pêche' },
  { hex: '#F79038', name: 'orange' },
  { hex: '#D9611C', name: 'citrouille' },
  { hex: '#8A4B22', name: 'chocolat' },
  { hex: '#FFF3A8', name: 'jaune poussin' },
  { hex: '#FBD62F', name: 'jaune soleil' },
  { hex: '#D9AE12', name: 'or' },
  { hex: '#B4E27E', name: 'vert pomme' },
  { hex: '#57BE6E', name: 'vert prairie' },
  { hex: '#1E8A63', name: 'vert sapin' },
  { hex: '#A9E5F0', name: 'bleu ciel' },
  { hex: '#41A7DB', name: 'bleu lagon' },
  { hex: '#2557A8', name: 'bleu nuit' },
  { hex: '#D6BCF5', name: 'lilas' },
  { hex: '#9159D6', name: 'violet' },
  { hex: '#5B2E8C', name: 'prune' },
  { hex: '#F5F2EC', name: 'blanc cassé' },
  { hex: '#C9C6D4', name: 'gris clair' },
  { hex: '#6E6880', name: 'gris' },
  { hex: '#231F2B', name: 'noir' },
]

export const PALETTE: Swatch[] = [...SPECIALS, ...PLAIN]
