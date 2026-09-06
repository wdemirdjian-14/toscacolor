export interface Swatch {
  hex: string
  name: string
}

/** 24 couleurs, rangees par familles pour qu'un enfant les retrouve. */
export const PALETTE: Swatch[] = [
  { hex: '#F5F2EC', name: 'blanc cassé' },
  { hex: '#C9C6D4', name: 'gris clair' },
  { hex: '#6E6880', name: 'gris' },
  { hex: '#231F2B', name: 'noir' },
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
]
