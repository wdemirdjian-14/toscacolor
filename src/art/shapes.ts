/**
 * Petite boite a outils de trace. Tous les modeles sont dessines dans un
 * repere 1000 x 1414 (proportions A4) puis mis a l'echelle a l'affichage.
 *
 * Regle absolue : chaque forme doit etre FERMEE. Un contour ouvert et le pot
 * de peinture fuit dans toute la page.
 */

export const VB_W = 1000
export const VB_H = 1414
export const INK = '#231f2b'
export const SW = 7

const base = `fill="none" stroke="${INK}" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round"`

export const path = (d: string, extra = '') => `<path d="${d}" ${base} ${extra}/>`
export const solid = (d: string) => `<path d="${d}" fill="${INK}" stroke="none"/>`
export const circle = (cx: number, cy: number, r: number) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" ${base}/>`
export const dot = (cx: number, cy: number, r: number) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${INK}" stroke="none"/>`
export const ellipse = (cx: number, cy: number, rx: number, ry: number, rot = 0) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${base} transform="rotate(${rot} ${cx} ${cy})"/>`

export function group(children: string[], transform?: string) {
  return `<g${transform ? ` transform="${transform}"` : ''}>${children.join('')}</g>`
}

export function page(children: string[]): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${VB_W}" height="${VB_H}" ` +
    `viewBox="0 0 ${VB_W} ${VB_H}">${children.join('')}</svg>`
  )
}

const rad = (deg: number) => (deg * Math.PI) / 180

/** Etoile a n branches, fermee. */
export function star(cx: number, cy: number, r: number, n = 5, inner = 0.42, rot = -90) {
  const pts: string[] = []
  for (let i = 0; i < n * 2; i++) {
    const rr = i % 2 === 0 ? r : r * inner
    const a = rad(rot + (i * 180) / n)
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`)
  }
  return path(`M${pts.join('L')}Z`)
}

/** Coeur pose sur sa pointe. */
export function heart(cx: number, cy: number, s: number) {
  const d =
    `M ${cx},${cy + s * 0.75} ` +
    `C ${cx - s * 1.3},${cy - s * 0.1} ${cx - s * 0.85},${cy - s * 0.95} ${cx - s * 0.32},${cy - s * 0.6} ` +
    `C ${cx - s * 0.14},${cy - s * 0.5} ${cx - s * 0.05},${cy - s * 0.36} ${cx},${cy - s * 0.24} ` +
    `C ${cx + s * 0.05},${cy - s * 0.36} ${cx + s * 0.14},${cy - s * 0.5} ${cx + s * 0.32},${cy - s * 0.6} ` +
    `C ${cx + s * 0.85},${cy - s * 0.95} ${cx + s * 1.3},${cy - s * 0.1} ${cx},${cy + s * 0.75} Z`
  return path(d)
}

/** Nuage : ventre plat, trois bosses. */
export function cloud(cx: number, cy: number, w: number, h: number) {
  const l = cx - w / 2
  const r = cx + w / 2
  const b = cy + h / 2
  const t = cy - h / 2
  const d =
    `M ${l},${b} ` +
    `C ${l - w * 0.06},${b - h * 0.5} ${l + w * 0.04},${b - h * 0.85} ${l + w * 0.22},${b - h * 0.72} ` +
    `C ${l + w * 0.26},${t - h * 0.12} ${cx + w * 0.12},${t - h * 0.18} ${cx + w * 0.2},${b - h * 0.66} ` +
    `C ${r - w * 0.08},${b - h * 0.95} ${r + w * 0.08},${b - h * 0.4} ${r},${b} Z`
  return path(d)
}

/** Corne torsadee : le cone plus ses stries. */
export function horn(cx: number, cy: number, w: number, h: number, tilt = 0) {
  const half = w / 2
  const cone = path(
    `M ${-half},0 C ${-half * 0.7},${-h * 0.45} ${-half * 0.4},${-h * 0.8} 0,${-h} ` +
      `C ${half * 0.4},${-h * 0.8} ${half * 0.7},${-h * 0.45} ${half},0 ` +
      `C ${half * 0.4},${w * 0.28} ${-half * 0.4},${w * 0.28} ${-half},0 Z`,
  )
  const stripes = [0.22, 0.45, 0.68].map((f) => {
    const y = -h * f
    const hw = half * (1 - f * 0.78)
    return path(`M ${-hw},${y + w * 0.1} Q 0,${y - w * 0.16} ${hw},${y - w * 0.02}`)
  })
  return group([cone, ...stripes], `translate(${cx} ${cy}) rotate(${tilt})`)
}

/** Oreille : une goutte, plus son interieur. */
export function ear(cx: number, cy: number, w: number, h: number, tilt = 0) {
  const outer = path(
    `M 0,0 C ${-w * 0.62},${-h * 0.3} ${-w * 0.42},${-h * 0.86} 0,${-h} ` +
      `C ${w * 0.42},${-h * 0.86} ${w * 0.62},${-h * 0.3} 0,0 Z`,
  )
  const inner = path(
    `M 0,${-h * 0.16} C ${-w * 0.32},${-h * 0.38} ${-w * 0.22},${-h * 0.72} 0,${-h * 0.82} ` +
      `C ${w * 0.22},${-h * 0.72} ${w * 0.32},${-h * 0.38} 0,${-h * 0.16} Z`,
  )
  return group([outer, inner], `translate(${cx} ${cy}) rotate(${tilt})`)
}

/** Oeil ferme et souriant : deux traits, pas de zone a colorier.
 *  `flip` fait partir les cils vers la gauche : a utiliser pour l'oeil gauche,
 *  pour que les cils s'ecartent du nez au lieu de se rejoindre au milieu. */
export function happyEye(cx: number, cy: number, r: number, flip = false) {
  const dir = flip ? -1 : 1
  const lid = path(`M ${cx - r},${cy} Q ${cx},${cy - r * 1.2} ${cx + r},${cy}`)
  const lashes = [0, 1, 2]
    .map((i) => {
      const a = (-58 + i * 30) * (Math.PI / 180)
      const ox = cx + dir * r * 0.92
      const oy = cy - r * 0.22
      return path(
        `M ${ox.toFixed(1)},${oy.toFixed(1)} ` +
          `L ${(ox + dir * Math.cos(a) * r * 0.62).toFixed(1)},${(oy + Math.sin(a) * r * 0.62).toFixed(1)}`,
      )
    })
    .join('')
  return lid + lashes
}

/** Oeil ouvert : globe, pupille pleine, reflet, cils. */
export function openEye(cx: number, cy: number, r: number) {
  return (
    ellipse(cx, cy, r * 0.72, r) +
    dot(cx, cy + r * 0.08, r * 0.44) +
    `<circle cx="${cx - r * 0.18}" cy="${cy - r * 0.2}" r="${r * 0.16}" fill="#fff" stroke="none"/>` +
    path(`M ${cx - r * 0.75},${cy - r * 0.78} L ${cx - r * 1.25},${cy - r * 1.15}`) +
    path(`M ${cx + r * 0.75},${cy - r * 0.78} L ${cx + r * 1.25},${cy - r * 1.15}`)
  )
}

/** Fleur a petales : chaque petale est une zone a colorier. */
export function flower(cx: number, cy: number, r: number, petals = 5) {
  const out: string[] = []
  for (let i = 0; i < petals; i++) {
    const a = rad((i * 360) / petals - 90)
    const px = cx + Math.cos(a) * r * 0.76
    const py = cy + Math.sin(a) * r * 0.76
    out.push(
      `<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="${(r * 0.5).toFixed(1)}" ry="${(
        r * 0.3
      ).toFixed(1)}" fill="none" stroke="${INK}" stroke-width="${SW}" transform="rotate(${(
        (i * 360) / petals
      ).toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)})"/>`,
    )
  }
  out.push(circle(cx, cy, r * 0.24))
  return group(out)
}

/** Bandes d'arc-en-ciel, chacune fermee pour etre remplie separement. */
export function rainbow(cx: number, cy: number, outer: number, bands: number, thickness: number) {
  const out: string[] = []
  for (let i = 0; i < bands; i++) {
    const ro = outer - i * thickness
    const ri = ro - thickness
    out.push(
      path(
        `M ${cx - ro},${cy} A ${ro},${ro} 0 0 1 ${cx + ro},${cy} ` +
          `L ${cx + ri},${cy} A ${ri},${ri} 0 0 0 ${cx - ri},${cy} Z`,
      ),
    )
  }
  return group(out)
}

/** Semis de petites etoiles et points, pour occuper le fond. */
export function sparkles(list: Array<[number, number, number]>) {
  return group(
    list.map(([x, y, r]) =>
      r > 10 ? star(x, y, r, 4, 0.3) : `<circle cx="${x}" cy="${y}" r="${r}" fill="${INK}"/>`,
    ),
  )
}

/** Colline fermee : sert de sol, colorable. */
export function hill(y: number, amp: number) {
  return path(
    `M 0,${VB_H} L 0,${y + amp} ` +
      `C ${VB_W * 0.25},${y - amp} ${VB_W * 0.55},${y + amp * 1.6} ${VB_W},${y - amp * 0.4} ` +
      `L ${VB_W},${VB_H} Z`,
  )
}

/** Cadre de page : donne une bordure fermee au fond, pour pouvoir le colorier. */
export function frame() {
  return path(`M 34,34 L ${VB_W - 34},34 L ${VB_W - 34},${VB_H - 34} L 34,${VB_H - 34} Z`)
}
