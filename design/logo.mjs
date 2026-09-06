/**
 * Régénère toutes les déclinaisons du logo depuis l'original.
 *   node design/logo.mjs design/logo-source.png
 *
 * Nécessite pngjs, installé à la volée : c'est un outil d'atelier, il n'a pas à
 * alourdir les dépendances de l'application.
 *   npm i --no-save pngjs
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = process.argv[2] ?? join(here, 'logo-source.png')
const out = join(here, '..', 'public')
const tmp = mkdtempSync(join(tmpdir(), 'tosca-logo-'))
const run = (args) => execFileSync('node', args, { stdio: 'inherit' })
const sips = (args) => execFileSync('sips', args, { stdio: 'ignore' })

run([join(here, 'logo-cut.mjs'), src, join(tmp, 'cut.png'), join(tmp, 'icon.png')])

// L'en-tête affiche le logo vers 54 px : 200 px couvre les écrans à trois fois
// la densité sans embarquer une image inutilement lourde.
sips(['-Z', '200', join(tmp, 'cut.png'), '--out', join(out, 'logo.png')])
for (const [size, name] of [
  [512, 'icon-512.png'],
  [192, 'icon-192.png'],
  [180, 'apple-touch-icon.png'],
  [96, 'favicon.png'],
]) {
  sips(['-Z', String(size), join(tmp, 'icon.png'), '--out', join(out, name)])
}

run([
  join(here, 'logo-shrink.mjs'),
  join(out, 'logo.png'),
  join(out, 'icon-512.png'),
  join(out, 'icon-192.png'),
  join(out, 'apple-touch-icon.png'),
  join(out, 'favicon.png'),
])
