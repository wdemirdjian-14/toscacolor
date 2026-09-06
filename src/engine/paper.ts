/** Taille de travail : A4 a 150 dpi. Assez fin pour l'ecran, imprimable en A4. */
export const PAPER_W = 1240
export const PAPER_H = 1754

/** Rasterise le SVG du modele en un calque de trait noir sur fond transparent. */
export function rasterizeLineArt(svg: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = PAPER_W
    canvas.height = PAPER_H
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      ctx.drawImage(img, 0, 0, PAPER_W, PAPER_H)
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
  const ctx = lineArt.getContext('2d', { willReadFrequently: true })!
  const data = ctx.getImageData(0, 0, PAPER_W, PAPER_H).data
  const mask = new Uint8Array(PAPER_W * PAPER_H)
  for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3]
  return mask
}

export function makeCanvas(w = PAPER_W, h = PAPER_H): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}
