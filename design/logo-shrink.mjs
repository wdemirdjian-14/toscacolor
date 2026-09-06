/**
 * Allège les PNG photographiques.
 *
 * Ces images partent dans le préchargement hors ligne, donc leur poids compte.
 * On retire les deux bits de poids faible de chaque canal : invisible sur un
 * dessin aux aplats larges, mais la compression y gagne beaucoup.
 */
import { PNG } from 'pngjs'
import { readFileSync, writeFileSync, statSync } from 'node:fs'

for (const file of process.argv.slice(2)) {
  const before = statSync(file).size
  const img = PNG.sync.read(readFileSync(file))
  for (let i = 0; i < img.data.length; i += 4) {
    for (let c = 0; c < 3; c++) img.data[i + c] = (img.data[i + c] & 0xfc) | 2
  }
  writeFileSync(file, PNG.sync.write(img, { deflateLevel: 9 }))
  const after = statSync(file).size
  console.log(
    `${file.split('/').pop().padEnd(22)} ${(before / 1024).toFixed(0)} Ko → ${(after / 1024).toFixed(0)} Ko`,
  )
}
