/** Taille de travail : A4 a 150 dpi. Assez fin pour l'ecran, leger en memoire. */
export const PAPER_W = 1240
export const PAPER_H = 1754

/** A4 a 300 dpi, la resolution d'impression : exactement le double. */
export const PRINT_SCALE = 2

/** Rasterise le SVG du modele en un calque de trait noir sur fond transparent. */
export function rasterizeLineArt(svg: string, w = PAPER_W, h = PAPER_H): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      // Le modele est vectoriel : a 300 dpi le trait reste net, il n'est pas agrandi.
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('modele illisible'))
    }
    img.src = url
  })
}

/** Masque des murs : l'alpha du trait, un octet par pixel. */
export function buildMask(lineArt: HTMLCanvasElement): Uint8Array {
  const w = lineArt.width
  const h = lineArt.height
  const ctx = lineArt.getContext('2d', { willReadFrequently: true })!
  const data = ctx.getImageData(0, 0, w, h).data
  const mask = new Uint8Array(w * h)
  for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3]
  return mask
}

export function makeCanvas(w = PAPER_W, h = PAPER_H): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

/** Libere la memoire d'un canevas hors-ecran : un A4 300 dpi pese 35 Mo. */
export function releaseCanvas(c: HTMLCanvasElement) {
  c.width = 0
  c.height = 0
}
