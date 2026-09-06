/** Taille de travail : A4 a 150 dpi. Assez fin pour l'ecran, leger en memoire. */
export const PAPER_W = 1240
export const PAPER_H = 1754

/** A4 a 300 dpi, la resolution d'impression : exactement le double. */
export const PRINT_SCALE = 2

/**
 * D'ou vient le trait d'un modele.
 *
 * Les coloriages de la bibliotheque sont vectoriels : ils se rerasterisent net a
 * n'importe quelle resolution. Ceux fabriques a partir d'une photo sont des
 * pixels : on les produit d'emblee en 300 dpi, et l'impression les utilise tels
 * quels au lieu de les agrandir.
 */
export type LineArt = { kind: 'svg'; svg: string } | { kind: 'png'; url: string }

/** Rasterise le modele en un calque de trait noir sur fond transparent. */
export function rasterizeLineArt(art: LineArt, w = PAPER_W, h = PAPER_H): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    let objectUrl = ''
    if (art.kind === 'svg') {
      objectUrl = URL.createObjectURL(new Blob([art.svg], { type: 'image/svg+xml' }))
    }
    img.onload = () => {
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, w, h)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      resolve(canvas)
    }
    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      reject(new Error('modèle illisible'))
    }
    img.src = art.kind === 'svg' ? objectUrl : art.url
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
