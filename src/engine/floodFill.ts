/**
 * Remplissage par zone (le "pot de peinture").
 *
 * Le trait du modele est rasterise dans un masque : mask[i] = alpha du pixel de
 * trait. Un pixel est un mur des que son alpha depasse WALL. Le remplissage se
 * propage donc dans la zone fermee, sans jamais tenir compte de ce qui a deja
 * ete peint : taper deux fois dans la meme zone la recolorie entierement.
 */

export const WALL = 110

export interface Region {
  visited: Uint8Array
  x0: number
  y0: number
  x1: number
  y1: number
}

// Un seul tampon reutilise : une page A4 a 150 dpi, c'est 2,2 Mo par allocation.
let scratch: Uint8Array | null = null
let scratchSize = 0
function getScratch(size: number): Uint8Array {
  if (!scratch || scratchSize !== size) {
    scratch = new Uint8Array(size)
    scratchSize = size
  } else {
    scratch.fill(0)
  }
  return scratch
}

/**
 * Parcours par lignes de balayage depuis (sx, sy). Retourne les pixels de la
 * zone et sa boite englobante, ou null si le doigt est tombe sur un trait.
 */
export function computeRegion(
  mask: Uint8Array,
  w: number,
  h: number,
  sx: number,
  sy: number,
  ownBuffer = false,
): Region | null {
  sx = Math.round(sx)
  sy = Math.round(sy)
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return null
  if (mask[sy * w + sx] > WALL) return null

  const visited = ownBuffer ? new Uint8Array(w * h) : getScratch(w * h)
  const stack: number[] = [sx, sy]
  let x0 = sx
  let y0 = sy
  let x1 = sx
  let y1 = sy

  while (stack.length) {
    const y = stack.pop()!
    const x = stack.pop()!
    const row = y * w
    if (visited[row + x]) continue

    // On etend vers la gauche puis vers la droite jusqu'aux murs.
    let left = x
    while (left > 0 && !visited[row + left - 1] && mask[row + left - 1] <= WALL) left--
    let right = x
    while (right < w - 1 && !visited[row + right + 1] && mask[row + right + 1] <= WALL) right++

    if (left < x0) x0 = left
    if (right > x1) x1 = right
    if (y < y0) y0 = y
    if (y > y1) y1 = y

    for (let i = left; i <= right; i++) visited[row + i] = 1

    // On empile les segments voisins au-dessus et en dessous.
    for (const ny of [y - 1, y + 1]) {
      if (ny < 0 || ny >= h) continue
      const nrow = ny * w
      let inRun = false
      for (let i = left; i <= right; i++) {
        const open = !visited[nrow + i] && mask[nrow + i] <= WALL
        if (open && !inRun) {
          stack.push(i, ny)
          inRun = true
        } else if (!open) {
          inRun = false
        }
      }
    }
  }

  return { visited, x0, y0, x1, y1 }
}

/**
 * Peint la zone sur le calque couleur.
 *
 * La frange anti-aliasee du trait est peinte elle aussi (dilatation de 1 px),
 * sinon un liseré blanc reste visible le long de chaque contour.
 */
export function paintRegion(
  ctx: CanvasRenderingContext2D,
  mask: Uint8Array,
  w: number,
  region: Region,
  rgb: [number, number, number],
) {
  const bw = region.x1 - region.x0 + 1
  const bh = region.y1 - region.y0 + 1
  const img = ctx.getImageData(region.x0, region.y0, bw, bh)
  const d = img.data
  const [r, g, b] = rgb
  const { visited } = region

  for (let y = 0; y < bh; y++) {
    const gy = y + region.y0
    const grow = gy * w
    for (let x = 0; x < bw; x++) {
      const gx = x + region.x0
      const gi = grow + gx
      let paint = visited[gi] === 1
      if (!paint && mask[gi] < 235) {
        // frange : voisine d'un pixel rempli et pas encore du trait plein
        paint =
          (gx > 0 && visited[gi - 1] === 1) ||
          (gx < w - 1 && visited[gi + 1] === 1) ||
          visited[gi - w] === 1 ||
          visited[gi + w] === 1
      }
      if (!paint) continue
      const p = (y * bw + x) * 4
      d[p] = r
      d[p + 1] = g
      d[p + 2] = b
      d[p + 3] = 255
    }
  }
  ctx.putImageData(img, region.x0, region.y0)
}

/** Rend la zone sous forme de masque opaque, pour brider le pinceau en mode facile. */
export function regionToCanvas(region: Region, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(w, h)
  const d = img.data
  for (let i = 0; i < region.visited.length; i++) {
    if (region.visited[i]) d[i * 4 + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return c
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
