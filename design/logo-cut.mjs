/**
 * Prépare les déclinaisons du logo.
 *  - logo.png : le cercle détouré, fond transparent, pour l'en-tête du site
 *  - icon.png : le même posé sur un carré rose, pour l'icône d'application
 *               (sans quoi iOS afficherait des coins blancs)
 */
import { PNG } from 'pngjs'
import { readFileSync, writeFileSync } from 'node:fs'

const src = PNG.sync.read(readFileSync(process.argv[2]))
const { width: w, height: h, data } = src
const at = (x, y) => (y * w + x) * 4

// Le cercle est centré : on trouve son rayon en avançant depuis le bord gauche
// jusqu'au premier pixel qui n'est pas du blanc de fond.
const midY = h >> 1
let left = 0
while (left < w / 2) {
  const p = at(left, midY)
  if (data[p] < 245 || data[p + 1] < 245 || data[p + 2] < 245) break
  left++
}
const cx = w / 2
const cy = h / 2
const radius = cx - left
console.log(`cercle : centre ${cx}, rayon ${Math.round(radius)} (marge blanche ${left} px)`)

// Une teinte prise dans l'aplat rose, pour combler les coins de l'icône.
const pink = (() => {
  const p = at(Math.round(cx - radius * 0.84), midY)
  return [data[p], data[p + 1], data[p + 2]]
})()
console.log('rose échantillonné :', pink.map((v) => v.toString(16).padStart(2, '0')).join(''))

const cut = new PNG({ width: w, height: h })
const icon = new PNG({ width: w, height: h })

for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const p = at(x, y)
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
    // Bord adouci sur un pixel et demi : sans ça le cercle a des marches.
    const alpha = Math.max(0, Math.min(1, radius - d + 0.5)) * 255

    cut.data[p] = data[p]
    cut.data[p + 1] = data[p + 1]
    cut.data[p + 2] = data[p + 2]
    cut.data[p + 3] = alpha

    const a = alpha / 255
    icon.data[p] = data[p] * a + pink[0] * (1 - a)
    icon.data[p + 1] = data[p + 1] * a + pink[1] * (1 - a)
    icon.data[p + 2] = data[p + 2] * a + pink[2] * (1 - a)
    icon.data[p + 3] = 255
  }
}

writeFileSync(process.argv[3], PNG.sync.write(cut))
writeFileSync(process.argv[4], PNG.sync.write(icon))
console.log('écrit :', process.argv[3], 'et', process.argv[4])
