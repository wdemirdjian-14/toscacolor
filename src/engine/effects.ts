/**
 * Couleurs speciales : les paillettes.
 *
 * Le semis doit etre reproductible. Un coloriage se rejoue — pour l'annulation,
 * et surtout pour reimprimer en 300 dpi — donc chaque geste porte sa graine :
 * les memes paillettes retombent au meme endroit, a l'ecran comme sur le papier.
 */

export type EffectId = 'paillettes'

/** Generateur pseudo-aleatoire minuscule et deterministe. */
export function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const newSeed = () => (Math.random() * 0xffffffff) >>> 0

const TINTS = ['#ffffff', '#fff7cf', '#ffeaf5', '#e9f6ff']

function sparkle(ctx: CanvasRenderingContext2D, rnd: () => number, x: number, y: number, scale: number) {
  const r = (1.2 + rnd() * 2.4) * scale
  ctx.fillStyle = TINTS[Math.floor(rnd() * TINTS.length)]
  ctx.globalAlpha = 0.55 + rnd() * 0.45
  if (rnd() < 0.22) {
    // quelques eclats a quatre branches, pour que ca accroche la lumiere
    const b = r * 2.6
    ctx.beginPath()
    ctx.moveTo(x, y - b)
    ctx.quadraticCurveTo(x, y, x + b, y)
    ctx.quadraticCurveTo(x, y, x, y + b)
    ctx.quadraticCurveTo(x, y, x - b, y)
    ctx.quadraticCurveTo(x, y, x, y - b)
    ctx.fill()
  } else {
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** Sème des paillettes dans une zone déjà remplie, sans jamais déborder. */
export function sparkleRegion(
  ctx: CanvasRenderingContext2D,
  visited: Uint8Array,
  w: number,
  box: { x0: number; y0: number; x1: number; y1: number },
  seed: number,
  scale = 1,
) {
  const bw = box.x1 - box.x0 + 1
  const bh = box.y1 - box.y0 + 1
  // La densité se calcule en unités de page : même rendu à l'écran et à 300 dpi.
  const area = (bw * bh) / (scale * scale)
  const count = Math.max(10, Math.min(900, Math.round(area / 2200)))
  const rnd = seeded(seed)

  ctx.save()
  for (let i = 0, placed = 0; i < count * 5 && placed < count; i++) {
    const x = box.x0 + Math.floor(rnd() * bw)
    const y = box.y0 + Math.floor(rnd() * bh)
    if (!visited[y * w + x]) continue
    sparkle(ctx, rnd, x, y, scale)
    placed++
  }
  ctx.restore()
}

/** Sème des paillettes le long d'un trait, dans son épaisseur. */
export function sparkleStroke(
  ctx: CanvasRenderingContext2D,
  pts: Array<{ x: number; y: number }>,
  size: number,
  seed: number,
  scale = 1,
) {
  const rnd = seeded(seed)
  const spread = size / 2
  ctx.save()
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    const n = Math.max(1, Math.round((len * size) / (900 * scale)))
    for (let k = 0; k < n; k++) {
      const t = rnd()
      const ang = rnd() * Math.PI * 2
      const rad = Math.sqrt(rnd()) * spread * 0.82
      sparkle(
        ctx,
        rnd,
        a.x + (b.x - a.x) * t + Math.cos(ang) * rad,
        a.y + (b.y - a.y) * t + Math.sin(ang) * rad,
        scale,
      )
    }
  }
  ctx.restore()
}
