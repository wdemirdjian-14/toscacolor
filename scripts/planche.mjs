/**
 * Genere une planche de tous les modeles d'un theme, en PNG-ready HTML.
 *   node scripts/planche.mjs > planche.html
 * Utile pour relire la bibliotheque d'un coup d'oeil avant d'ajouter des pages.
 */
import { build } from 'esbuild'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dir = mkdtempSync(join(tmpdir(), 'tosca-'))
const out = join(dir, 'art.mjs')
await build({
  entryPoints: ['src/art/unicorns.ts'],
  bundle: true,
  format: 'esm',
  outfile: out,
  logLevel: 'silent',
})
const { UNICORN_PAGES } = await import(`file://${out}`)

const cards = UNICORN_PAGES.map(
  (p) => `<figure><div class="sheet">${p.svg()}</div><figcaption>${p.title}<span>${p.level}</span></figcaption></figure>`,
).join('')

writeFileSync(
  process.argv[2] ?? 'planche.html',
  `<!doctype html><meta charset="utf-8"><title>ToscaColor — thème Licornes</title>
<style>
 body{margin:0;padding:28px;background:#f4f2f8;font:14px/1.5 -apple-system,system-ui,sans-serif;color:#231f2b}
 h1{font-size:22px;margin:0 0 4px}
 p{margin:0 0 24px;color:#7c748f}
 .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:22px}
 figure{margin:0}
 .sheet{background:#fff;border:1px solid #e2dfec;border-radius:14px;overflow:hidden;aspect-ratio:1000/1414}
 .sheet svg{width:100%;height:100%;display:block}
 figcaption{display:flex;justify-content:space-between;gap:8px;padding:8px 2px 0;font-weight:600}
 figcaption span{color:#7c748f;font-weight:400}
</style>
<h1>ToscaColor — thème Licornes</h1>
<p>${UNICORN_PAGES.length} modèles originaux, aucun personnage sous licence.</p>
<div class="grid">${cards}</div>`,
)
